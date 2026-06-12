const topicInput = document.getElementById("topicInput");
const searchBtn = document.getElementById("searchBtn");
const aiBtn = document.getElementById("aiBtn");

const resultDiv = document.getElementById("result");
const questionsDiv = document.getElementById("questions");

let currentText = "";

searchBtn.addEventListener("click", searchArticle);
aiBtn.addEventListener("click", generateAIQuestions);

//////////////////////////////////////////////////////
// MAIN
//////////////////////////////////////////////////////
async function searchArticle() {

    const topic = topicInput.value.trim();

    if (!topic) {
        resultDiv.innerHTML = `<div class="card">Enter a topic.</div>`;
        return;
    }

    aiBtn.disabled = true;
    questionsDiv.innerHTML = "";
    resultDiv.innerHTML = `<div class="card">Loading Wikipedia...</div>`;

    try {
        await loadWikipediaPage(topic);
    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = `
            <div class="card">
                Failed to load page.<br><br>
                ${escapeHtml(err.message)}
            </div>
        `;
    }
}

//////////////////////////////////////////////////////
// WIKIPEDIA FETCH
//////////////////////////////////////////////////////
async function loadWikipediaPage(topic) {

    // 1. search title
    const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*&srlimit=1`
    );

    const searchData = await searchRes.json();

    if (!searchData.query?.search?.length) {
        throw new Error("No Wikipedia page found.");
    }

    const title = searchData.query.search[0].title;

    // 2. get extract
    const pageRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`
    );

    const pageData = await pageRes.json();
    const page = Object.values(pageData.query.pages)[0];

    if (!page?.extract) {
        throw new Error("No Wikipedia content found.");
    }

    const text = cleanText(page.extract);

    // 3. reject stub articles
    if (text.length < 800) {
        throw new Error("Wikipedia page too short (stub article). Try a broader topic.");
    }

    // 4. extract robust paragraphs
    const paragraphs = extractParagraphs(text);

    if (paragraphs.length < 2) {
        throw new Error("Not enough usable Wikipedia content.");
    }

    // 5. pick 2–3 paragraph passage (random middle section)
    const maxStart = Math.max(0, paragraphs.length - 3);
    const start = Math.floor(Math.random() * (maxStart + 1));

    const excerpt = paragraphs.slice(start, start + 3).join("\n\n");

    currentText = excerpt;
    aiBtn.disabled = false;

    const link =
        `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

    resultDiv.innerHTML = `
        <div class="card">
            <div class="title">${escapeHtml(title)}</div>
            <div class="meta">Source: Wikipedia</div>

            <div class="abstract">${escapeHtml(excerpt)}</div>

            <br>
            <a href="${link}" target="_blank">View Article</a>
        </div>
    `;
}

//////////////////////////////////////////////////////
// PARAGRAPH EXTRACTION (ROBUST)
//////////////////////////////////////////////////////
function extractParagraphs(text) {

    const cleaned = text
        .replace(/\r/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    let paragraphs = cleaned.split("\n\n");

    if (paragraphs.length < 2) {
        paragraphs = cleaned.split("\n");
    }

    return paragraphs
        .map(p => p.trim())
        .filter(p =>
            p.length > 80 &&
            !p.startsWith("References") &&
            !p.startsWith("See also") &&
            !p.startsWith("External links")
        );
}

//////////////////////////////////////////////////////
// CLEAN TEXT
//////////////////////////////////////////////////////
function cleanText(text) {
    return text
        .replace(/\r/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

//////////////////////////////////////////////////////
// AI QUESTIONS
//////////////////////////////////////////////////////
async function generateAIQuestions() {

    questionsDiv.innerHTML =
        `<div class="card">Generating SAT questions...</div>`;

    try {

        const res = await fetch("https://ai.scoreladder.org", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: currentText })
        });

        const data = await res.json();

        renderQuestions(data);

    } catch (err) {

        questionsDiv.innerHTML =
            `<div class="card">${escapeHtml(err.message)}</div>`;
    }
}

//////////////////////////////////////////////////////
// QUESTIONS
//////////////////////////////////////////////////////
function renderQuestions(data) {

    if (!data.questions) {
        questionsDiv.innerHTML =
            `<div class="card">Invalid response</div>`;
        return;
    }

    questionsDiv.innerHTML = "";

    data.questions.forEach((q, i) => {

        const shuffled = q.choices
            .map((c, idx) => ({ text: c, idx }))
            .sort(() => Math.random() - 0.5);

        const correct = shuffled.findIndex(c => c.idx === q.answer);

        questionsDiv.innerHTML += `
            <div class="card">
                <h3>Question ${i + 1}</h3>
                <p>${escapeHtml(q.question)}</p>

                ${shuffled.map((c, idx) => `
                    <div class="choice">
                        <b>${["A","B","C","D"][idx]}.</b>
                        ${escapeHtml(c.text)}
                    </div>
                `).join("")}

                <div class="answer">
                    Answer: ${["A","B","C","D"][correct]}
                </div>
            </div>
        `;
    });
}

//////////////////////////////////////////////////////
// HTML SAFE
//////////////////////////////////////////////////////
function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
