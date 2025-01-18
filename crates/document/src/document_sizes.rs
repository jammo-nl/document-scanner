use super::point::Point;

// Define page sizes in portrait
static A4: [f32; 2] = [210.0, 297.0];

// convert mm to pixels with a specific DPI
fn dpi_to_px(dpi: f32, mm: f32) -> f32 {
    dpi * mm / 25.4
}

// return the page sizes in mm or pixel for the page in portrait or landscape
pub enum DocumentSize {
    A4,
    Custom(f32, f32),
}
impl DocumentSize {
    pub fn size_mm(&self, portrait: bool) -> Point {
        let result: Point = match self {
            DocumentSize::A4 => A4.into(),
            DocumentSize::Custom(x, y) => [*x, *y].into(),
        };

        if portrait {
            result
        } else {
            Point::new(result.y, result.x)
        }
    }
    pub fn size_px(&self, portrait: bool, dpi: f32) -> Point {
        Point::new(
            dpi_to_px(dpi, self.size_mm(portrait).x),
            dpi_to_px(dpi, self.size_mm(portrait).y),
        )
    }
    // return the document corner points (tl, tr, br, bl)
    pub fn document_points(&self, portrait: bool, dpi: f32) -> [Point; 4] {
        [
            [0.0, 0.0].into(),
            [dpi_to_px(dpi, self.size_mm(portrait).x), 0.0].into(),
            [
                dpi_to_px(dpi, self.size_mm(portrait).x),
                dpi_to_px(dpi, self.size_mm(portrait).y),
            ]
            .into(),
            [0.0, dpi_to_px(dpi, self.size_mm(portrait).y)].into(),
        ]
    }
}
