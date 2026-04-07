let slug=null;
let eventSource=null;
const newEndPointBtn=document.getElementById("newEndpoint")
const endPointUrlEl=document.getElementById("endpointUrl");
const requestsEl=document.getElementById("requests");

//const backend_url='http://localhost:3000';

newEndPointBtn.addEventListener("click",async()=>{
    try {
        const response=await fetch('http://localhost:3000/api/endpoint',{method:'POST'});
        //const response=await fetch(`${backend_url}/api/endpoint`,{method:'POST'});
        const data=await response.json();

        //extract slug
        slug=data.url.split("/q/")[1];
        endPointUrlEl.textContent=window.location.origin+ data.url;
        //endPointUrlEl.textContent=`${backend_url}${data.url}`;

        fetchRequest();  
        connectSSE(); 
    } catch (error) {
        console.error("Error creating endpoint",error);
        
    }
})

async function fetchRequest(){
    if(!slug) return;
    try {
        const response=await fetch (`http://localhost:3000/api/endpoint/${slug}/request`);
        console.log("current slug:" ,slug)
        const data=await response.json();
        
        requestsEl.innerHTML="";
        data.requests.forEach(addRequestToFrontend);
    } catch (error) {
        console.error("error fetching request",error)
    }
}

function connectSSE(){
    if(!slug) return;
    if(eventSource) eventSource.close(); // Close previous connection if exists

    eventSource=new EventSource(`http://localhost:3000/api/stream/${slug}`); 
    eventSource.onmessage=(event)=>{
        const data=JSON.parse(event.data);
        if(data.type==="connected"){
            console.log("SSE connection established");
        }else if(data.type==='heartbeat'){
            console.log("heartbeat received");
        }else{
            addRequestToFrontend(data,true);
        }
    }
    eventSource.onerror=(error)=>{
        console.error("SSE error",error);
        
        // Try to reconnect after a delay
        setTimeout(()=>{
            console.log("Reconnecting SSE...");
            connectSSE();
         },5000)  

        }
        eventSource.onclose= function(){
            console.log("SSE connection closed");
        }
        return eventSource;
}


function addRequestToFrontend(req,prepend=false){
    const div=document.createElement("div");
    div.classList.add("request")
    div.innerHTML=`
    <span class="method">${req.method}</span>
    <span class="ip">${req.ip}</span>
    <pre>${JSON.stringify(req.body || {} ,null,2)}</pre>
    <small>${new Date(req.createdAt || Date.now()).toLocaleTimeString()}</small>
    `
    if(prepend){
        requestsEl.prepend(div); // Add new request at the top
    }else{
        requestsEl.appendChild(div); // Add existing requests at the bottom
    }   

}

