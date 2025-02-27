from pdf2image import convert_from_path

def pdf_to_png(pdf_path, output_folder, dpi=300):
    images = convert_from_path(pdf_path, dpi=dpi)  # Convert PDF to images
    for i, image in enumerate(images):
        image_path = f"{output_folder}/page_{i + 1}.png"
        image.save(image_path, "PNG")  # Save as PNG
        print(f"Saved: {image_path}")

# Example usage
pdf_to_png("files/resume.pdf", "files")


