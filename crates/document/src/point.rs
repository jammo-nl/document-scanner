use std::convert::From;

#[derive(Debug)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}
impl Point {
    pub fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    pub fn distance(&self, target: &Point) -> f32 {
        let a = (self.x - target.x).abs();
        let b = (self.y - target.y).abs();

        let c = a * a + b * b;
        c.sqrt()
    }

    pub fn scale(&self, scale: f32) -> Self {
        Point::new(self.x * scale, self.y * scale)
    }
}

// conversions
impl From<[f32; 2]> for Point {
    fn from(value: [f32; 2]) -> Self {
        Point::new(value[0], value[1])
    }
}
impl From<Point> for [f32; 2] {
    fn from(value: Point) -> Self {
        [value.x, value.y]
    }
}
