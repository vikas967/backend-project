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

export { app }