from io import BytesIO

from PIL import Image, ImageDraw


def image_bytes(with_spots: bool = True) -> bytes:
    image = Image.new("RGB", (320, 240), (50, 145, 60))
    if with_spots:
        draw = ImageDraw.Draw(image)
        for x, y in [(55, 60), (115, 92), (185, 54), (245, 135), (150, 170)]:
            draw.ellipse((x, y, x + 38, y + 30), fill=(110, 52, 22))
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def test_valid_image_returns_feature_based_advisory(client, auth_headers):
    response = client.post(
        "/api/diseases/analyze-image",
        headers=auth_headers,
        data={"crop_id": "1"},
        files={"image": ("cotton-leaf.png", image_bytes(), "image/png")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["analysis_mode"] == "demo-image-heuristic"
    assert body["possible_issue"] == "Leaf spot pattern"
    assert body["confidence"] > 45
    assert body["features"]["brown_ratio"] > 0
    assert "not a trained diagnostic model" in body["analysis_label"]


def test_uniform_image_is_inconclusive(client, auth_headers):
    response = client.post(
        "/api/diseases/analyze-image",
        headers=auth_headers,
        data={"crop_id": "1"},
        files={"image": ("plain-leaf.png", image_bytes(False), "image/png")},
    )
    assert response.status_code == 200
    assert response.json()["low_confidence"] is True


def test_invalid_and_oversized_images_are_rejected(client, auth_headers):
    invalid = client.post(
        "/api/diseases/analyze-image",
        headers=auth_headers,
        data={"crop_id": "1"},
        files={"image": ("notes.txt", b"not an image", "text/plain")},
    )
    oversized = client.post(
        "/api/diseases/analyze-image",
        headers=auth_headers,
        data={"crop_id": "1"},
        files={"image": ("large.png", b"0" * (10 * 1024 * 1024 + 1), "image/png")},
    )
    assert invalid.status_code == 415
    assert oversized.status_code == 413
