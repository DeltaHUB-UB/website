# Măsurători Baliză

## Data Input
- Read MPA GeoDataFrame (parquet files from directory_mpa).
- Read Coastline GeoDataFrame (parquet files from directory_lines).

## Preprocessing
- Smooth MPA Geometries using `smooth_geodataframe` to smooth polygons.
- Explode coastline multiparts into individual geometries using `.explode()`.

## Generate Perpendiculars and Polygons
For each `LineString` in the exploded coastline:
- Split lines into segments with `create_line_strings`.
- Generate perpendicular lines and points:
  - Calculate nearest points with `nearest_points`.
  - Calculate angles with `calculate_angle`.
  - Extend points to generate perpendiculars using `extend_point`.
- Create polygons from perpendicular lines:
  - Sort points using `sort_by_angle_from_middle`.
  - Form `Polygon` objects.
