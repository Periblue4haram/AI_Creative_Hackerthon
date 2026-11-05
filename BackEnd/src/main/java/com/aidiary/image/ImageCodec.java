package com.aidiary.image;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;

/** 이미지 디코딩, 크기 변경, 메타데이터 없는 JPEG 인코딩. */
public final class ImageCodec {

    private static final float JPEG_QUALITY = 0.9f;

    private ImageCodec() {}

    /** 형식을 읽지 못하면 null을 돌려준다. */
    public static BufferedImage decode(byte[] bytes) {
        try {
            return ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IOException e) {
            return null;
        }
    }

    public static BufferedImage resize(BufferedImage source, int width, int height) {
        if (source.getWidth() == width && source.getHeight() == height && source.getType() == BufferedImage.TYPE_INT_RGB) {
            return source;
        }
        return draw(
                source,
                width,
                height,
                AffineTransform.getScaleInstance(
                        (double) width / source.getWidth(), (double) height / source.getHeight()));
    }

    /** 비율을 유지한 채 긴 변이 maxEdge를 넘지 않게 줄인다. */
    public static BufferedImage fitWithin(BufferedImage source, int maxEdge) {
        int longEdge = Math.max(source.getWidth(), source.getHeight());
        if (longEdge <= maxEdge) {
            return source;
        }
        double ratio = (double) maxEdge / longEdge;
        return resize(
                source,
                Math.max(1, (int) Math.round(source.getWidth() * ratio)),
                Math.max(1, (int) Math.round(source.getHeight() * ratio)));
    }

    /** 투명 배경은 JPEG에 담을 수 없어 흰색으로 채운다. */
    public static BufferedImage draw(BufferedImage source, int width, int height, AffineTransform transform) {
        BufferedImage target = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = target.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, width, height);
        g.drawImage(source, transform, null);
        g.dispose();
        return target;
    }

    /** 픽셀만 담으므로 EXIF 같은 메타데이터가 남지 않는다. */
    public static byte[] encodeJpeg(BufferedImage image) {
        BufferedImage rgb = image.getType() == BufferedImage.TYPE_INT_RGB
                ? image
                : draw(image, image.getWidth(), image.getHeight(), new AffineTransform());
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream output = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(output);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.write(null, new IIOImage(rgb, null, null), param);
        } catch (IOException e) {
            throw new IllegalStateException("JPEG 인코딩 실패", e);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
