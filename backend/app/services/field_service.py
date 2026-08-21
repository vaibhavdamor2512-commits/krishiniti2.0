import math


def validate_polygon(polygon: list[list[float]]) -> list[list[float]]:
    if len(polygon) < 3:
        raise ValueError("Please draw a valid field boundary.")
    cleaned: list[list[float]] = []
    for point in polygon:
        if len(point) != 2:
            raise ValueError("Please draw a valid field boundary.")
        lat, lon = float(point[0]), float(point[1])
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("Please draw a valid field boundary.")
        cleaned.append([lat, lon])
    if len({(p[0], p[1]) for p in cleaned}) < 3:
        raise ValueError("Please draw a valid field boundary.")
    if cleaned[0] != cleaned[-1]:
        cleaned.append(cleaned[0])
    return cleaned


def calculate_area_acres(polygon: list[list[float]]) -> float:
    """Calculate polygon area using a local equirectangular projection."""
    points = validate_polygon(polygon)
    earth_radius = 6_371_008.8
    mean_lat = math.radians(sum(p[0] for p in points[:-1]) / (len(points) - 1))
    xy = [(earth_radius * math.radians(lon) * math.cos(mean_lat), earth_radius * math.radians(lat)) for lat, lon in points]
    area_m2 = abs(sum(xy[i][0] * xy[i+1][1] - xy[i+1][0] * xy[i][1] for i in range(len(xy)-1))) / 2
    if area_m2 < 1:
        raise ValueError("Please draw a valid field boundary.")
    return round(area_m2 / 4046.8564224, 3)


def polygon_centroid(polygon: list[list[float]]) -> tuple[float, float]:
    points = validate_polygon(polygon)[:-1]
    return round(sum(p[0] for p in points) / len(points), 6), round(sum(p[1] for p in points) / len(points), 6)
