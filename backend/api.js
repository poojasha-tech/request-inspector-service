import express from 'express';
const router = express.Router();
import prisma from '../prisma/db.js';
import crypto from 'crypto';


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
const clients=[];
router.get('/stream',(req,res)=>{
    res.setHeader('content-type','text/event-stream');
    res.setHeader('cache-control','no-cache');
    res.setHeader('connection','keep-alive');
    res.flushHeaders(); // flush the headers to establish the SSE connection

    const clientId=Date.now();
    const newClient={
        id:clientId,
        res
    }
    clients.push(newClient);

    // When the client disconnects, we will remove it from the clients array
    req.on('close',()=>{
        const index=clients.findIndex(client=>client.id===clientId); 
        if(index!==-1){ // if client is found, we will remove it from the clients array to prevent memory leaks and unnecessary processing
            clients.splice(index,1); // remove only the disconnected client from the clients array
        }   
    });
})

//send updates to all connected clients
function broadcast(data){
    clients.forEach(client=>{
        client.res.write(`data: ${JSON.stringify(data)}\n\n`); // send data to the client in SSE format
    })
}

// this route will create a new endpoint with a unique slug and return the URL to the client
router.post('/endpoint', async (req, res) => { // this route will create a new endpoint with a unique slug and return the URL to the client
    const slug=crypto.randomBytes(4).toString('hex'); // Generate a random slug
    const endpoint=await prisma.endpoint.create({
        data:{
            slug
        }
    })
    res.json({
        url:`/q/${endpoint.slug}`,
    });
})
router.all('/q/:slug', async (req, res) => { // this route will capture all incoming requests to the generated endpoint 
                                             // and store the request details in the database
    const {slug}=req.params;
    const endpoint=await prisma.endpoint.findUnique({
        where:{
            slug
        }
    })
    if(!endpoint){
        return res.status(404).json({error:'Endpoint not found'})
    }
    // if endpoint exists, we will store the request details in the database
    const savedRequest=await prisma.request.create({
        data:{
            method:req.method,
            headers:JSON.stringify(req.headers), 
            body:req.body ? JSON.stringify(req.body) : null, 
            ip:req.ip, 
            endpointId:endpoint.id
        }
    })
    res.json({
        message:'Request received',
        data:{
            method:savedRequest.method,
            headers:JSON.parse(savedRequest.headers),
            body:savedRequest.body ? JSON.parse(savedRequest.body) : null,
            ip:savedRequest.ip
        }
    })  

})

export default router;

