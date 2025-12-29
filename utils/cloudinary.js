const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary Upload Image
const cloudinaryUploadImage = async (fileToUpload) => {
  try {
    const data = await cloudinary.uploader.upload(fileToUpload, {
      resource_type: "auto",
    });
    return data;
  } catch (error) {
    console.log(error);
    throw new Error("Internal Server Error (cloudinary)");
  }
};

// Cloudinary Upload PDF
// const cloudinaryUploadPDF = async (fileToUpload) => {
//   try {
//     const data = await cloudinary.uploader.upload(fileToUpload, {
//       resource_type: "raw", // Use 'raw' for non-image files like PDFs
//     });
//     return data;
//   } catch (error) {
//     console.log(error);
//     throw new Error("Internal Server Error (cloudinary)");
//   }
// };

const cloudinaryUploadPDF = async (fileToUpload, options = {}) => {
  try {
    const uploadOptions = {
      resource_type: "raw", // Use 'raw' for non-image files like PDFs
      ...options, // Merge any additional options
    };

    const data = await cloudinary.uploader.upload(fileToUpload, uploadOptions);
    return data; // Return only the secure URL
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Error uploading file to Cloudinary: " + error.message);
  }
};

// Cloudinary Upload Image subject
const cloudinaryUploadSubjectImage = async (fileToUpload) => {
  try {
    const data = await cloudinary.uploader.upload(fileToUpload, {
      resource_type: "png",
    });
    return data;
  } catch (error) {
    console.log(error);
    throw new Error("Internal Server Error (cloudinary)");
  }
};

// Cloudinary Remove Image
const cloudinaryRemoveImage = async (imagePublicId) => {
  try {
    const result = await cloudinary.uploader.destroy(imagePublicId);
    return result;
  } catch (error) {
    console.log(error);
    throw new Error("Internal Server Error (cloudinary)");
  }
};

// Cloudinary Remove Multiple Image
const cloudinaryRemoveMultipleImage = async (publicIds) => {
  try {
    const result = await cloudinary.v2.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.log(error);
    throw new Error("Internal Server Error (cloudinary)");
  }
};

module.exports = {
  cloudinaryUploadImage,
  cloudinaryRemoveImage,
  cloudinaryRemoveMultipleImage,
  cloudinaryUploadSubjectImage,
  cloudinaryUploadPDF,
};
