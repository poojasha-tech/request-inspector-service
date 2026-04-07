import express from 'express';
const router = express.Router();
import prisma from '../prisma/db.js';
import { generateSignedId, validateSignedId } from './helper.js';
// lets do with long pooling , SSE is pretty specific 
// could also do this with setInterval for every 2000 ms check for new requests 
// and send updates to clients but using database triggers is more efficient and real-time
// setInterval(async()=>{
//     const newRequests=await prisma.request.findMany({
//         where:{
//             notified:false
//         },
//         include:{
//             endpoint:true
//         }
//     })
//     if(newRequests.length>0){
//         broadcast(newRequests); // send updates to all connected clients
//         // mark the requests as notified in the database to prevent sending duplicate notifications to clients
//         const requestIds=newRequests.map(request=>request.id);
//         await prisma.request.updateMany({
//             where:{
//                 id:{
//                     in:requestIds
//                 }
//             },
//             data:{
//                 notified:true
//             }
//         })
//     }
// },2000) 



// SSE (Server-Sent Events) endpoint to stream real-time updates to the client


const clients = [];
//heartbeat interval to delete disconnected clients from array
setInterval(() => {
    for (let i = clients.length - 1; i >= 0; i--) {
        const client = clients[i]
        if (client.res.finished) {
            clients.splice(i, 1);
        }
    }
}, 30000) //every 30 seconds;


router.get('/stream/:slug', (req, res) => {
    res.setHeader('content-type', 'text/event-stream');
    res.setHeader('cache-control', 'no-cache');
    res.setHeader('connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish the SSE connection

    const client = { slug: req.params.slug, res }
    clients.push(client)

    //initial connected message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    //heartbeat every 15 seconds
    const heartbeat = setInterval(() => {
        if (res.finished) {
            clearInterval(heartbeat);
            const idx = clients.findIndex(c => c.res === res)
            if (idx !== -1) clients.splice(idx, 1);
        }
        else {
            res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`)
        }
    }, 15000);

    // When the client disconnects, we will remove it from the clients array
    req.on('close', () => {
        clearInterval(heartbeat)
        const index = clients.findIndex(c => c.res === res); // find the index of the disconnected client in the clients array
        if (index !== -1) { // if client is found, we will remove it from the clients array to prevent memory leaks and unnecessary processing
            clients.splice(index, 1); // remove only the disconnected client from the clients array
        }
    });
})


//send updates to the client
function broadcast(slug, data) {
    //limit size of the body and headers

    const message = `data: ${JSON.stringify(data)}\n\n`
    clients.forEach(client => {
        if (client.slug === slug) {
            client.res.write(message)
        }
    })
}

// this route will create a new endpoint with a unique slug and return the URL to the client
router.post('/endpoint', async (req, res) => { // this route will create a new endpoint with a unique slug and return the URL to the client
    res.json({
        url: `/q/${generateSignedId()}`,
    });
})
// localhost;4000/q/41234njilkj
router.all('/q/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        if(!validateSignedId(slug)) {
            return res.status(404).send("Invalid slug")
        }
      
      const requestData = {
            url: slug,
            method: req.method,
            headers: JSON.stringify(req.headers),
            body: req.body ? JSON.stringify(req.body) : null,
            ip: req.ip,
        }

        const savedRequest = await prisma.request.create({
            data: requestData
        })

        res.status(200).send({status: "ok"})

    } catch (error) {
        console.log(error)
        res.status(500).send("something went wrong!")


    }
})

router.get('/endpoint/:slug/request', async (req, res) => {
    try {
      const slug = req.params.slug
      
      if (!validateSignedId(slug)) {
          return res.status(404).send("Invalid slug")
        }
      
        const requests = await prisma.request.findMany({
            where: {
                url: slug
            },
        })
      
        res.json(requests)

    } catch (error) {
        console.log(error)
        res.status(500).send("Something went wrong!")
    }
})

export default router;

