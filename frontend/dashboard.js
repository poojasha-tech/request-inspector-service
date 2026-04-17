let slug = null;
const newEndPointBtn = document.getElementById("newEndpoint")
const endPointUrlEl = document.getElementById("endpointUrl");
const requestsEl = document.getElementById("requests");

//const backend_url='http://localhost:3000';
    const BACKEND_URL = "http://localhost:3000/api";

newEndPointBtn.addEventListener("click", async () => {
    try {
        const response = await fetch(BACKEND_URL + '/endpoint', { method: 'POST' });
        const data = await response.json();

        const url = data.url;
        slug = url.split('/q/')[1];
        localStorage.setItem("slug", slug);

        endPointUrlEl.textContent = `Your unique link: ${BACKEND_URL}/q/${slug}`;
        fetchNewRequest();

        // Set up polling every 5 seconds
        setInterval(fetchNewRequest, 5000);
    } catch (error) {
        console.error("Error creating endpoint", error);

    }
})

async function fetchNewRequest() {
  if (!slug) return;

  try {
    const response = await fetch(
      `${BACKEND_URL}/endpoint/${slug}/request`
    );

    const data = await response.json();

    const newRequests = data.requests.slice(lastRequestCount);

    newRequests.forEach((req) => {
      addRequestToFrontend(req, true);
    });

    lastRequestCount = data.requests.length;

  } catch (err) {
    console.error(err);
  }
}

function addRequestToFrontend(req, prepend = false) {
    const div = document.createElement("div");
    div.classList.add("request")
    div.innerHTML = `
    <span class="method">${req.method}</span>
    <span class="ip">${req.ip}</span>
    <pre>${JSON.stringify(req.body || {}, null, 2)}</pre>
    <small>${new Date(req.createdAt || Date.now()).toLocaleTimeString()}</small>
    `
    if (prepend) {
        requestsEl.prepend(div); // Add new request at the top
    } else {
        requestsEl.appendChild(div); // Add existing requests at the bottom
    }

}

window.addEventListener("DOMContentLoaded", async () => {
    const savedSlug = localStorage.getItem("slug");
    if (savedSlug) {
        slug = savedSlug;

        endPointUrlEl.textContent = `Your unique link: ${BACKEND_URL}/q/${slug}`;

        requestsEl.innerHTML = ""

        const res = await fetch(
            `${BACKEND_URL}/endpoint/${slug}/request`
        );

        const data = await res.json();

        lastRequestCount = data.requests.length;
        fetchNewRequest();
        setInterval(fetchNewRequest, 5000);
    }

})



