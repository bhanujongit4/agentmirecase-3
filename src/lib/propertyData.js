import path from "node:path";
import { promises as fs } from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");

const files = {
  basics: path.join(DATA_DIR, "property_basics.json"),
  characteristics: path.join(DATA_DIR, "property_characteristics.json"),
  images: path.join(DATA_DIR, "property_images.json"),
};

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function getMergedProperties() {
  const [basics, characteristics, images] = await Promise.all([
    readJsonFile(files.basics),
    readJsonFile(files.characteristics),
    readJsonFile(files.images),
  ]);

  const characteristicsById = new Map(characteristics.map((item) => [item.id, item]));
  const imagesById = new Map(images.map((item) => [item.id, item]));

  return basics.map((basic) => {
    const details = characteristicsById.get(basic.id) ?? {};
    const imageInfo = imagesById.get(basic.id) ?? {};

    return {
      id: basic.id,
      title: basic.title,
      price: basic.price,
      location: basic.location,
      bedrooms: details.bedrooms ?? null,
      bathrooms: details.bathrooms ?? null,
      sizeSqft: details.size_sqft ?? null,
      amenities: details.amenities ?? [],
      imageUrl: imageInfo.image_url ?? "",
    };
  });
}

export function filterProperties(properties, filters) {
  const {
    location,
    maxBudget,
    minBedrooms,
    minBathrooms,
    minSizeSqft,
    amenities = [],
  } = filters;

  return properties.filter((property) => {
    if (location) {
      const value = location.toLowerCase();
      if (!property.location.toLowerCase().includes(value)) {
        return false;
      }
    }

    if (maxBudget && property.price > maxBudget) {
      return false;
    }

    if (minBedrooms && property.bedrooms < minBedrooms) {
      return false;
    }

    if (minBathrooms && property.bathrooms < minBathrooms) {
      return false;
    }

    if (minSizeSqft && property.sizeSqft < minSizeSqft) {
      return false;
    }

    if (amenities.length > 0) {
      const propertyAmenities = property.amenities.map((item) => item.toLowerCase());
      const wantedAmenities = amenities.map((item) => item.toLowerCase());
      const hasAllAmenities = wantedAmenities.every((amenity) =>
        propertyAmenities.includes(amenity),
      );

      if (!hasAllAmenities) {
        return false;
      }
    }

    return true;
  });
}
