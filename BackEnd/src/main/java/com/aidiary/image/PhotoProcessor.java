package com.aidiary.image;

import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.drew.imaging.ImageMetadataReader;
import com.drew.imaging.ImageProcessingException;
import com.drew.lang.GeoLocation;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Component;

/**
 * 사진을 받아 EXIF를 읽은 뒤 메타데이터 없는 JPEG로 다시 만든다.
 * 픽셀만 옮겨 담으므로 GPS를 포함한 어떤 메타데이터도 저장 파일에 남지 않는다.
 */
@Component
public class PhotoProcessor {

    private static final Set<String> ALLOWED_FORMATS = Set.of("jpeg", "jpg", "png", "webp");
    private static final long MAX_PIXELS = 100_000_000L;
    private static final int MAX_LONG_EDGE = 2048;
    private static final DateTimeFormatter EXIF_TIME = DateTimeFormatter.ofPattern("yyyy:MM:dd HH:mm:ss");

    public ProcessedPhoto process(byte[] bytes) {
        BufferedImage image = decode(bytes);
        Metadata metadata = readMetadata(bytes);
        LocalDateTime takenAt = readTakenAt(metadata);
        GeoLocation location = readLocation(metadata);
        BufferedImage normalized = scale(rotate(image, readOrientation(metadata)));
        return new ProcessedPhoto(
                encodeJpeg(normalized),
                takenAt,
                location == null ? null : location.getLatitude(),
                location == null ? null : location.getLongitude());
    }

    private static BufferedImage decode(byte[] bytes) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = input == null ? null : ImageIO.getImageReaders(input);
            if (readers == null || !readers.hasNext()) {
                throw new ApiException(ErrorCode.UNSUPPORTED_IMAGE_TYPE);
            }
            ImageReader reader = readers.next();
            try {
                if (!ALLOWED_FORMATS.contains(reader.getFormatName().toLowerCase(Locale.ROOT))) {
                    throw new ApiException(ErrorCode.UNSUPPORTED_IMAGE_TYPE);
                }
                reader.setInput(input, true, true);
                if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_PIXELS) {
                    throw new ApiException(ErrorCode.UNSUPPORTED_IMAGE_TYPE);
                }
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            if (e instanceof ApiException api) {
                throw api;
            }
            throw new ApiException(ErrorCode.UNSUPPORTED_IMAGE_TYPE);
        }
    }

    private static Metadata readMetadata(byte[] bytes) {
        try {
            return ImageMetadataReader.readMetadata(new ByteArrayInputStream(bytes), bytes.length);
        } catch (ImageProcessingException | IOException | RuntimeException e) {
            return new Metadata();
        }
    }

    private static LocalDateTime readTakenAt(Metadata metadata) {
        ExifSubIFDDirectory exif = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
        String value = exif == null ? null : exif.getString(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL);
        if (value == null) {
            return null;
        }
        try {
            return LocalDateTime.parse(value.strip(), EXIF_TIME);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static GeoLocation readLocation(Metadata metadata) {
        GpsDirectory gps = metadata.getFirstDirectoryOfType(GpsDirectory.class);
        GeoLocation location = gps == null ? null : gps.getGeoLocation();
        return location == null || location.isZero() ? null : location;
    }

    private static int readOrientation(Metadata metadata) {
        ExifIFD0Directory exif = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
        Integer value = exif == null ? null : exif.getInteger(ExifIFD0Directory.TAG_ORIENTATION);
        return value == null ? 1 : value;
    }

    /** EXIF를 지우면 회전 정보도 사라지므로 픽셀을 미리 돌려 둔다. */
    private static BufferedImage rotate(BufferedImage image, int orientation) {
        int w = image.getWidth();
        int h = image.getHeight();
        AffineTransform t = new AffineTransform();
        boolean swap = orientation >= 5 && orientation <= 8;
        switch (orientation) {
            case 2 -> t.setTransform(-1, 0, 0, 1, w, 0);
            case 3 -> t.setTransform(-1, 0, 0, -1, w, h);
            case 4 -> t.setTransform(1, 0, 0, -1, 0, h);
            case 5 -> t.setTransform(0, 1, 1, 0, 0, 0);
            case 6 -> t.setTransform(0, 1, -1, 0, h, 0);
            case 7 -> t.setTransform(0, -1, -1, 0, h, w);
            case 8 -> t.setTransform(0, -1, 1, 0, 0, w);
            default -> {}
        }
        return draw(image, swap ? h : w, swap ? w : h, t);
    }

    private static BufferedImage scale(BufferedImage image) {
        return ImageCodec.fitWithin(image, MAX_LONG_EDGE);
    }

    private static BufferedImage draw(BufferedImage source, int width, int height, AffineTransform transform) {
        return ImageCodec.draw(source, width, height, transform);
    }

    private static byte[] encodeJpeg(BufferedImage image) {
        return ImageCodec.encodeJpeg(image);
    }
}
