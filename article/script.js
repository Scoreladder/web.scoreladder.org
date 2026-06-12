const topicInput = document.getElementById("topicInput");
const searchBtn = document.getElementById("searchBtn");
const resultDiv = document.getElementById("result");

searchBtn.addEventListener("click", searchArticle);

async function searchArticle() {

    const topic = topicInput.value.trim();

    if (!topic) {
        resultDiv.innerHTML = `<div class="card">Enter a topic.</div>`;
        return;
    }

    resultDiv.innerHTML = `<div class="card">Loading Wikipedia...</div>`;

    try {

        // 1. SEARCH TITLE
        const searchRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*&srlimit=1`
        );

        const searchData = await searchRes.json();

        if (!searchData.query?.search?.length) {
            throw new Error("No Wikipedia page found.");
        }

        const title = searchData.query.search[0].title;

        // 2. GET PARSED HTML (IMPORTANT PART)
        const htmlRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`
        );

        const htmlData = await htmlRes.json();

        const htmlString = htmlData.parse?.text?.["*"];

        if (!htmlString) {
            throw new Error("No HTML content returned.");
        }

        // 3. PARSE HTML INTO DOM
        const doc = new DOMParser().parseFromString(htmlString, "text/html");

        // 4. EXTRACT PARAGRAPHS FROM <p>
        let paragraphs = Array.from(doc.querySelectorAll("p"))
            .map(p => p.textContent.trim())
            .filter(p =>
                p.length > 50 &&
                !p.includes("coordinates") &&
                !p.includes("listen")
            );

        if (paragraphs.length < 2) {
            throw new Error("Not enough Wikipedia paragraphs found.");
        }

        // 5. PICK 2 RANDOM PARAGRAPHS
        paragraphs = paragraphs.sort(() => Math.random() - 0.5);
        const selected = paragraphs.slice(0, 2).join("\n\n");

        // 6. BUILD LINK
        const link =
            `https://en.wikipedia.org/wiki/${title.replace(/ /g, "_")}`;

        // 7. DISPLAY
        resultDiv.innerHTML = `
            <div class="card">
                <div class="title">${escapeHtml(title)}</div>
                <div class="meta">Source: Wikipedia (HTML extract)</div>

                <div class="abstract">${escapeHtml(selected)}</div>

                <br>
                <a href="${link}" target="_blank">View Article</a>
            </div>
        `;

    } catch (err) {
        resultDiv.innerHTML = `
            <div class="card">
                Error: ${escapeHtml(err.message)}
            </div>
        `;
    }
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
