package com.aidiary;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;

/** 테스트용 JPEG와, EXIF(촬영 시각, GPS, 회전)를 직접 넣은 JPEG를 만든다. */
final class TestPhotos {

    private TestPhotos() {}

    static byte[] plainJpeg(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            ImageIO.write(image, "jpeg", out);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        return out.toByteArray();
    }

    static byte[] plainJpeg() {
        return plainJpeg(40, 30);
    }

    /** dateTime 형식: "2026:11:07 03:00:00" */
    static byte[] exifJpeg(int width, int height, String dateTime, double latitude, double longitude, int orientation) {
        byte[] tiff = tiff(dateTime, latitude, longitude, orientation);
        byte[] exifHeader = "Exif\0\0".getBytes(StandardCharsets.ISO_8859_1);
        byte[] jpeg = plainJpeg(width, height);
        int segmentLength = 2 + exifHeader.length + tiff.length;
        ByteBuffer out = ByteBuffer.allocate(jpeg.length + 2 + segmentLength);
        out.put(jpeg, 0, 2); // SOI
        out.put((byte) 0xFF).put((byte) 0xE1).putShort((short) segmentLength);
        out.put(exifHeader).put(tiff);
        out.put(jpeg, 2, jpeg.length - 2);
        return out.array();
    }

    private static byte[] tiff(String dateTime, double latitude, double longitude, int orientation) {
        int ifd0Offset = 8;
        int ifd0Size = 2 + 3 * 12 + 4;
        int exifOffset = ifd0Offset + ifd0Size;
        int exifSize = 2 + 12 + 4;
        int dateOffset = exifOffset + exifSize;
        int gpsOffset = dateOffset + 20;
        int gpsSize = 2 + 4 * 12 + 4;
        int latOffset = gpsOffset + gpsSize;
        int lonOffset = latOffset + 24;

        ByteBuffer b = ByteBuffer.allocate(lonOffset + 24);
        b.put((byte) 'M').put((byte) 'M').putShort((short) 42).putInt(ifd0Offset);

        b.putShort((short) 3);
        entryShort(b, 0x0112, orientation);
        entryLong(b, 0x8769, exifOffset);
        entryLong(b, 0x8825, gpsOffset);
        b.putInt(0);

        b.putShort((short) 1);
        b.putShort((short) 0x9003).putShort((short) 2).putInt(20).putInt(dateOffset);
        b.putInt(0);
        b.put(dateTime.getBytes(StandardCharsets.US_ASCII)).put((byte) 0);

        b.putShort((short) 4);
        entryRef(b, 1, 'N');
        b.putShort((short) 2).putShort((short) 5).putInt(3).putInt(latOffset);
        entryRef(b, 3, 'E');
        b.putShort((short) 4).putShort((short) 5).putInt(3).putInt(lonOffset);
        b.putInt(0);

        rational(b, latitude);
        rational(b, longitude);
        return b.array();
    }

    private static void entryShort(ByteBuffer b, int tag, int value) {
        b.putShort((short) tag).putShort((short) 3).putInt(1).putShort((short) value).putShort((short) 0);
    }

    private static void entryLong(ByteBuffer b, int tag, int value) {
        b.putShort((short) tag).putShort((short) 4).putInt(1).putInt(value);
    }

    private static void entryRef(ByteBuffer b, int tag, char ref) {
        b.putShort((short) tag).putShort((short) 2).putInt(2).put((byte) ref).put((byte) 0).putShort((short) 0);
    }

    private static void rational(ByteBuffer b, double degrees) {
        b.putInt((int) Math.round(degrees * 1_000_000)).putInt(1_000_000);
        b.putInt(0).putInt(1);
        b.putInt(0).putInt(1);
    }
}
