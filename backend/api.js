import express from 'express';
const router = express.Router();
import prisma from '../prisma/db.js';
import { generateSignedId } from './helper.js';
import { validateSignedId } from './helper.js';


// doing it with uuid - universially unique identifier ,, modern version nanoid->

router.post('/endpoint', async (req, res) => { // this route will create a new endpoint with a unique slug and return the URL to the client
    res.json({
        url: `/q/${generateSignedId()}`,
    });
})

router.all('/q/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        
        if(!validateSignedId(slug)){
            return res.status(400).send("Invalid slug!");
        }

        const requestData = {
            url:slug,
            method:req.method,
            headers: JSON.stringify(req.headers),
            body: req.body ? JSON.stringify(req.body) : null,
            ip:req.ip
        }
        console.log("about to save in DB")

        const savedRequest = await prisma.request.create({
            data: requestData
        })
        return res.status(200).send("request received!")

    } catch (error) {
        console.log(error)
        res.status(500).send("something went wrong!")
    }
})

router.get('/endpoint/:slug/request', async (req, res) => {
    try {
        const slug = req.params.slug
        if(validateSignedId(slug)===false){
            return res.status(400).send("Invalid slug!")
        }
        const requests=await prisma.request.findMany({
            where:{
                url:slug
            }
        })
       res.json({requests});

    } catch (error) {
        console.log(error)
        res.status(500).send("Something went wrong!")
    }
})
export default router;

