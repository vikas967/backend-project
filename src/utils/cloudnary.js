import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'


    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadOnCloudinary = async (filePath) => {
        try {
            const result = await cloudinary.uploader.upload(filePath, { 
                resource_type: 'auto'
            })

            // file has been uploaded succesfully
            fs.unlinkSync(filePath); // delete the file after upload
            return result;
            
        } catch (error) {
            fs.unlinkSync(filePath); // delete the file if upload fails or locally saved temporary files
            return {
                error: 'Failed to upload file to Cloudinary',
                details: error.message || 'Unknown error'
            }
        }
    };

    export { uploadOnCloudinary };

    
   