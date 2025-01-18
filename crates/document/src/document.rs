use std::io::Cursor;

use super::document_sizes::DocumentSize;
use super::point::Point;
use image::buffer::ConvertBuffer;
use image::imageops::colorops::contrast_in_place;
use image::{
    codecs::jpeg::JpegEncoder,
    imageops::{rotate270, rotate90},
    DynamicImage, ImageBuffer, ImageDecoder, ImageReader, Rgb, RgbImage,
};
use image::{imageops, GrayImage, Luma, Pixel};
use imageproc::contours::Contour;
//use imageproc::distance_transform::Norm;
use imageproc::geometric_transformations::{warp, Projection};
use imageproc::geometry::contour_area;
use imageproc::point::Point as ImPoint;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub struct Document {
    image: RgbImage,
    corners: [Point; 4],
    target_size: DocumentSize,
    target_portrait: bool,
    target_dpi: f32,
}
#[wasm_bindgen]
impl Document {
    #[wasm_bindgen(constructor)]
    pub fn new(bytes: &[u8]) -> Self {
        // get image orientation if available and apply it to the image
        let mut img = ImageReader::new(Cursor::new(&bytes))
            .with_guessed_format()
            .unwrap()
            .into_decoder()
            .unwrap();
        let orientation = img.orientation().unwrap();
        let mut img = DynamicImage::from_decoder(img).unwrap();
        img.apply_orientation(orientation);

        let image = img.into_rgb8();

        // default to full width for the corners
        let corners = [
            [0.0, 0.0].into(),
            [image.width() as f32, 0.0].into(),
            [image.width() as f32, image.height() as f32].into(),
            [0.0, image.height() as f32].into(),
        ];
        let mut data = Self {
            image,
            corners,
            target_size: DocumentSize::A4,
            target_portrait: true,
            target_dpi: 300.0,
        };

        let _ = data.update_corners();
        //data.target();
        data
    }

    fn sobel(&self, input: &ImageBuffer<Luma<u8>, Vec<u8>>) -> ImageBuffer<Luma<u8>, Vec<u8>> {
        let width: u32 = input.width() - 2;
        let height: u32 = input.height() - 2;
        let mut buff: ImageBuffer<Luma<u8>, Vec<u8>> = ImageBuffer::new(width, height);

        for i in 0..width {
            for j in 0..height {
                /* Unwrap those loops! */
                let val0 = input.get_pixel(i, j).channels()[0] as i32;
                let val1 = input.get_pixel(i + 1, j).channels()[0] as i32;
                let val2 = input.get_pixel(i + 2, j).channels()[0] as i32;
                let val3 = input.get_pixel(i, j + 1).channels()[0] as i32;
                let val5 = input.get_pixel(i + 2, j + 1).channels()[0] as i32;
                let val6 = input.get_pixel(i, j + 2).channels()[0] as i32;
                let val7 = input.get_pixel(i + 1, j + 2).channels()[0] as i32;
                let val8 = input.get_pixel(i + 2, j + 2).channels()[0] as i32;
                /* Apply Sobel kernels */
                let gx = (-1 * val0) + (-2 * val3) + (-1 * val6) + val2 + (2 * val5) + val8;
                let gy = (-1 * val0) + (-2 * val1) + (-1 * val2) + val6 + (2 * val7) + val8;
                let mut mag = ((gx as f64).powi(2) + (gy as f64).powi(2)).sqrt();

                if mag > 255.0 {
                    mag = 255.0;
                }

                buff.put_pixel(i, j, Luma([mag as u8]));
            }
        }

        return buff;
    }

    fn update_corners(&mut self) {
        // scale factor
        let sf = self.image.width() as f32 / 500.0;

        // create small / grayscale image
        let mut image = image::imageops::resize(
            &self.image,
            (self.image.width() as f32 / sf) as u32,
            (self.image.height() as f32 / sf) as u32,
            image::imageops::FilterType::Nearest,
        );
        // we want a higher contrast
        contrast_in_place(&mut image, 40.0);

        let image: GrayImage = image.convert();
        let image = imageops::fast_blur(&image, 1.5);

        //let image = self.sobel(&image);
        let image = imageproc::edges::canny(&image, 10.0, 90.0);
        //let image = imageproc::morphology::close(&image, Norm::L1, 1);
        //image.save("./test_sobel.jpg");

        let contours: Vec<Contour<i32>> = imageproc::contours::find_contours(&image);
        let mut max_area = 0.0;
        let mut area_idx = 0;
        for (idx, contour) in contours.iter().enumerate() {
            if contour_area(&contour.points) > max_area {
                max_area = contour_area(&contour.points);
                area_idx = idx;
            }
        }

        if max_area > (image.width() as f64 * image.height() as f64) / 20.0 {
            let points = self.get_cornerpoints(&image, sf, &contours[area_idx].points);
            self.corners = points;
        }
    }

    fn get_cornerpoints(
        &self,
        image: &GrayImage,
        scale: f32,
        points: &Vec<ImPoint<i32>>,
    ) -> [Point; 4] {
        let mut tl_point = Point::new(0.0, 0.0);
        let mut tr_point = Point::new(0.0, 0.0);
        let mut bl_point = Point::new(0.0, 0.0);
        let mut br_point = Point::new(0.0, 0.0);

        let mut tl_dist = 0.0;
        let mut tr_dist = 0.0;
        let mut bl_dist = 0.0;
        let mut br_dist = 0.0;

        let center = Point::new(image.width() as f32 / 2.0, image.height() as f32 / 2.0);

        for point in points {
            let t_point = Point::new(point.x as f32, point.y as f32);
            let distance = center.distance(&t_point);

            if distance > tl_dist && t_point.x < center.x && t_point.y < center.y {
                tl_point = t_point;
                tl_dist = distance;
            } else if distance > tr_dist && t_point.x > center.x && t_point.y < center.y {
                tr_point = t_point;
                tr_dist = distance;
            } else if distance > bl_dist && t_point.x < center.x && t_point.y > center.y {
                bl_point = t_point;
                bl_dist = distance;
            } else if distance > br_dist && t_point.x > center.x && t_point.y > center.y {
                br_point = t_point;
                br_dist = distance;
            }
        }

        [
            tl_point.scale(scale),
            tr_point.scale(scale),
            br_point.scale(scale),
            bl_point.scale(scale),
        ]
    }

    fn get_jpg_array(&self, image: &ImageBuffer<Rgb<u8>, Vec<u8>>) -> Vec<u8> {
        // crate a jpeg image from the data
        let mut tgt = vec![];
        let mut enc = JpegEncoder::new_with_quality(&mut tgt, 70);
        let _ = enc.encode(
            &image,
            image.width(),
            image.height(),
            image::ExtendedColorType::Rgb8,
        );

        tgt
    }

    #[wasm_bindgen]
    pub fn set_target_dpi(&mut self, dpi: f32) {
        self.target_dpi = dpi;
    }

    // pub fn set_target_size(&mut self, document: DocumentSize) {
    //     self.target_size = document;
    // }

    #[wasm_bindgen]
    pub fn rotate_source_ccw(&mut self) {
        self.image = rotate270(&self.image)
    }
    #[wasm_bindgen]
    pub fn rotate_source_cw(&mut self) {
        self.image = rotate90(&self.image)
    }

    #[wasm_bindgen]
    pub fn source(&self) -> Vec<u8> {
        self.get_jpg_array(&self.image)
    }

    #[wasm_bindgen]
    pub fn source_thumb(&self) -> Vec<u8> {
        let image = image::imageops::resize(
            &self.image,
            self.target_size.size_px(self.target_portrait, 25.4).x as u32,
            self.target_size.size_px(self.target_portrait, 25.4).y as u32,
            image::imageops::FilterType::Triangle,
        );

        self.get_jpg_array(&image)
    }

    fn _target(&self) -> ImageBuffer<Rgb<u8>, Vec<u8>> {
        // transform the image
        let projection = Projection::from_control_points(
            [
                (self.corners[0].x, self.corners[0].y),
                (self.corners[1].x, self.corners[1].y),
                (self.corners[2].x, self.corners[2].y),
                (self.corners[3].x, self.corners[3].y),
            ],
            [
                (0.0, 0.0),
                (self.image.width() as f32, 0.0),
                (self.image.width() as f32, self.image.height() as f32),
                (0.0, self.image.height() as f32),
            ],
        )
        .unwrap();

        // get the correct cut-out
        let image = warp(
            &self.image,
            &projection,
            imageproc::geometric_transformations::Interpolation::Bilinear,
            image::Rgb([0, 0, 0]),
        );

        image
    }

    #[wasm_bindgen]
    pub fn target(&self) -> Vec<u8> {
        let image = self._target();
        let image = image::imageops::resize(
            &image,
            self.target_size
                .size_px(self.target_portrait, self.target_dpi)
                .x as u32,
            self.target_size
                .size_px(self.target_portrait, self.target_dpi)
                .y as u32,
            image::imageops::FilterType::Triangle,
        );

        image.save("./test.jpg");
        self.get_jpg_array(&image)
    }

    #[wasm_bindgen]
    pub fn target_thumb(&self) -> Vec<u8> {
        let image = self._target();
        let image = image::imageops::resize(
            &image,
            self.target_size.size_px(self.target_portrait, 25.4).x as u32,
            self.target_size.size_px(self.target_portrait, 25.4).y as u32,
            image::imageops::FilterType::Triangle,
        );

        self.get_jpg_array(&image)
    }
}
