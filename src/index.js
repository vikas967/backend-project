import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path: './env' // Ensure the path to your .env file is correct
})


connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
})
.catch((err) => {
    console.error('Error connecting to the database:', err);
    process.exit(1);
});

// import express from 'express';
// const app = express();

// ( async ()=>{
//     try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`) 
//     app.on('error', (err) => {
//         console.error('Error in MongoDB connection:', err);
//         throw err;
//     })

//     app.listen(process.env.PORT,()=>{
//         console.log(`Server is running on port ${process.env.PORT}`);
//     })
// }

// catch (error) {
//         console.error('Error connecting to MongoDB:', error);
//         process.exit(1);
//       }
// })()