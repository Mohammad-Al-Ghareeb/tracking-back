const PRODUCT_CONFIGURATIONS = {
  BLOUSE: {
    type: "BLOUSE",
    label: { ar: "بلوزة", en: "Blouse" },
    basePrice: 0,
    attributes: [
      field("blouseType", "نوع البلوزة", "Blouse type", ["REGULAR", "TSHIRT", "HOODIE", "FORMAL"]),
      field("fit", "القصة", "Fit", ["REGULAR", "SLIM", "OVERSIZED"]),
      field("neckline", "نوع الياقة", "Neckline", ["ROUND", "V_NECK", "HIGH", "POLO"]),
      field("sleeveLength", "طول الكم", "Sleeve length", ["SHORT", "HALF", "LONG"]),
      field("sleeveStyle", "شكل الكم", "Sleeve style", ["REGULAR", "WIDE", "PUFFED"]),
      field("blouseLength", "طول البلوزة", "Blouse length", ["SHORT", "REGULAR", "LONG"]),
      field("pattern", "النقشة", "Pattern", ["PLAIN", "STRIPED", "DOTTED", "CUSTOM"]),
    ],
    customizations: customizationFields(["POCKETS", "BUTTONS", "ZIPPER", "EMBROIDERY", "PRINT"]),
    measurements: measurements(["chest", "waist", "shoulder", "sleeveLength", "bodyLength"]),
  },
  SHIRT: {
    type: "SHIRT",
    label: { ar: "قميص", en: "Shirt" },
    basePrice: 0,
    attributes: [
      field("shirtType", "نوع القميص", "Shirt type", ["FORMAL", "CASUAL", "POLO"]),
      field("fit", "القصة", "Fit", ["SLIM", "REGULAR", "OVERSIZED"]),
      field("collarType", "نوع الياقة", "Collar type", ["CLASSIC", "BUTTON_DOWN", "MANDARIN"]),
      field("sleeveLength", "طول الكم", "Sleeve length", ["SHORT", "LONG"]),
      field("cuffType", "شكل الأكمام", "Cuff type", ["REGULAR", "BUTTON", "FRENCH"]),
      field("pocketCount", "عدد الجيوب", "Pocket count", ["ZERO", "ONE", "TWO"]),
      field("closureType", "نوع الإغلاق", "Closure", ["BUTTONS", "ZIPPER"]),
      field("shirtLength", "طول القميص", "Shirt length", ["SHORT", "REGULAR", "LONG"]),
      field("pattern", "النقشة", "Pattern", ["PLAIN", "STRIPED", "DOTTED", "CUSTOM"]),
    ],
    customizations: customizationFields(["EMBROIDERY", "PRINT"]),
    measurements: measurements(["chest", "waist", "shoulder", "sleeveLength", "bodyLength", "neck"]),
  },
  PANTS: {
    type: "PANTS",
    label: { ar: "بنطلون", en: "Pants" },
    basePrice: 0,
    attributes: [
      field("pantsType", "نوع البنطلون", "Pants type", ["JEANS", "FORMAL", "FABRIC", "SPORT"]),
      field("fit", "القصة", "Fit", ["SKINNY", "SLIM", "STRAIGHT", "WIDE", "BAGGY"]),
      field("waistRise", "ارتفاع الخصر", "Waist rise", ["LOW", "MID", "HIGH"]),
      field("pantsLength", "طول البنطلون", "Pants length", ["SHORT", "REGULAR", "LONG"]),
      field("legOpening", "نهاية الرجل", "Leg opening", ["REGULAR", "NARROW", "WIDE", "CUFFED"]),
      field("waistbandType", "نوع الخصر", "Waistband", ["REGULAR", "ELASTIC", "BELT"]),
      field("pocketCount", "عدد الجيوب", "Pocket count", ["ZERO", "TWO", "FOUR", "SIX"]),
      field("closureType", "نوع الإغلاق", "Closure", ["ZIPPER", "BUTTONS", "ELASTIC"]),
      field("pattern", "النقشة", "Pattern", ["PLAIN", "STRIPED", "CUSTOM"]),
    ],
    customizations: customizationFields(["EXTRA_ZIPPERS", "EMBROIDERY", "PLEATS"]),
    measurements: measurements(["waist", "hip", "legLength", "thigh"]),
  },
  DRESS: {
    type: "DRESS",
    label: { ar: "فستان", en: "Dress" },
    basePrice: 0,
    attributes: [
      field("dressType", "نوع الفستان", "Dress type", ["CASUAL", "FORMAL", "EVENING", "SUMMER"]),
      field("silhouette", "القصة", "Silhouette", ["STRAIGHT", "A_LINE", "MERMAID", "WIDE"]),
      field("dressLength", "طول الفستان", "Dress length", ["SHORT", "MIDI", "LONG"]),
      field("neckline", "نوع الياقة", "Neckline", ["ROUND", "V_NECK", "HIGH", "SQUARE"]),
      field("sleeveType", "نوع الأكمام", "Sleeves", ["SLEEVELESS", "SHORT", "LONG", "PUFFED"]),
      field("waistStyle", "شكل الخصر", "Waist style", ["DEFINED", "REGULAR", "HIGH"]),
      field("skirtStyle", "شكل التنورة", "Skirt style", ["STRAIGHT", "WIDE", "CIRCLE"]),
      field("backStyle", "نوع الظهر", "Back style", ["REGULAR", "OPEN", "BUTTONS", "ZIPPER"]),
      field("closureType", "نوع الإغلاق", "Closure", ["ZIPPER", "BUTTONS", "TIE"]),
      field("pattern", "النقشة", "Pattern", ["PLAIN", "STRIPED", "DOTTED", "CUSTOM"]),
    ],
    customizations: customizationFields(["LINING", "POCKETS", "EMBROIDERY", "BEADS", "LACE", "DECORATION"]),
    measurements: measurements(["chest", "waist", "hip", "shoulder", "dressLength", "sleeveLength"]),
  },
};

function option(value) {
  return { value, label: humanize(value), priceModifier: 0 };
}
function field(key, ar, en, values) {
  return { key, label: { ar, en }, required: true, options: values.map(option) };
}
function customizationFields(values) {
  return values.map((key) => ({ key, label: humanize(key), priceModifier: 0 }));
}
function measurements(keys) {
  return keys.map((key) => ({ key, label: humanize(key), required: true }));
}
function humanize(value) {
  return String(value).toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

const PRODUCT_TYPES = Object.keys(PRODUCT_CONFIGURATIONS);

function getProductConfiguration(productType) {
  return PRODUCT_CONFIGURATIONS[productType] || null;
}

function calculateConfigurationUnitPrice(productType, designAttributes = {}, customizations = {}) {
  const config = getProductConfiguration(productType);
  if (!config) return 0;
  let price = Number(config.basePrice || 0);
  for (const attribute of config.attributes) {
    const selected = attribute.options.find((item) => item.value === designAttributes?.[attribute.key]);
    price += Number(selected?.priceModifier || 0);
  }
  for (const customization of config.customizations) {
    if (customizations?.[customization.key]) price += Number(customization.priceModifier || 0);
  }
  return Math.max(0, price);
}

function validateProductConfigurationPayload(payload) {
  const config = getProductConfiguration(payload?.productType);
  if (!config) return "Invalid product type";
  const attributes = payload?.designAttributes || {};
  for (const attribute of config.attributes) {
    const value = attributes[attribute.key];
    if (attribute.required && !value) return `Missing design attribute: ${attribute.key}`;
    if (value && !attribute.options.some((optionItem) => optionItem.value === value)) return `Invalid design attribute: ${attribute.key}`;
  }
  if (payload?.measurementMode === "STANDARD") {
    if (!String(payload?.standardSize || "").trim()) return "Standard size is required";
  } else if (payload?.measurementMode === "CUSTOM") {
    const values = payload?.measurements || {};
    for (const measurement of config.measurements) {
      if (measurement.required && !(Number(values[measurement.key]) > 0)) return `Missing measurement: ${measurement.key}`;
    }
  } else {
    return "Invalid measurement mode";
  }
  return null;
}

function buildOrderDescription(productType, designAttributes = {}) {
  const config = getProductConfiguration(productType);
  if (!config) return String(productType || "Order");
  const values = config.attributes.slice(0, 3).map((attribute) => designAttributes?.[attribute.key]).filter(Boolean);
  return [config.label.en, ...values].join(" - ");
}

module.exports = { PRODUCT_CONFIGURATIONS, PRODUCT_TYPES, getProductConfiguration, calculateConfigurationUnitPrice, validateProductConfigurationPayload, buildOrderDescription };
