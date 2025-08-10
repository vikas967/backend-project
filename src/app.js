import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN, // Use environment variable or default to '*'
    credentials: true // Allow credentials to be sent with requests 
}))

app.use(express.json({limit: '10kb'}))
app.use(express.urlencoded({extended: true, limit: '10kb'}))
app.use(express.static('public'))
app.use(cookieParser())


// routes import 
import userRouter from './routes/user.routes.js'

// routes declaration
app.use("/api/v1/users", userRouter)
app.get('/test', (req, res) => res.send('Server is working!'));



export { app }