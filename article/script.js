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
    resultDiv.innerHTML = `<div class="card">Loading Wikipedia passage...</div>`;

    try {
        await fetchWikipediaExcerpt(topic);
    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = `
            <div class="card">
                Failed to load passage.<br><br>
                ${escapeHtml(err.message)}
            </div>
        `;
    }
}

//////////////////////////////////////////////////////
// WIKIPEDIA → REAL 2–3 PARAGRAPH PASSAGE
//////////////////////////////////////////////////////
async function fetchWikipediaExcerpt(topic) {

    // 1. search page
    const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*&srlimit=1`
    );

    const searchData = await searchRes.json();

    if (!searchData.query?.search?.length) {
        throw new Error("No Wikipedia results found.");
    }

    const title = searchData.query.search[0].title;

    // 2. fetch full extract
    const pageRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`
    );

    const pageData = await pageRes.json();
    const page = Object.values(pageData.query.pages)[0];

    let text = page.extract;

    if (!text) {
        throw new Error("No article content found.");
    }

    // 3. split into paragraphs (THIS is the key)
    const paragraphs = text
        .split("\n\n")
        .map(p => p.trim())
        .filter(p => p.length > 80);

    if (paragraphs.length === 0) {
        throw new Error("No usable excerpt found.");
    }

    // 4. take first 2–3 paragraphs (simple + stable)
    const excerpt = paragraphs.slice(0, 3).join("\n\n");

    currentText = excerpt;
    aiBtn.disabled = false;

    resultDiv.innerHTML = `
        <div class="card">
            <div class="title">${escapeHtml(title)}</div>
            <div class="meta">Source: Wikipedia excerpt</div>
            <div class="abstract">${escapeHtml(excerpt)}</div>
        </div>
    `;
}

//////////////////////////////////////////////////////
// TOPIC CHECK (simple but effective)
//////////////////////////////////////////////////////
function isOnTopic(text, topic) {

    const words = topic.toLowerCase().split(/\s+/);
    const sample = text.toLowerCase();

    let hits = 0;

    for (const w of words) {
        if (sample.includes(w)) hits++;
    }

    return hits >= Math.max(1, words.length - 1);
}

//////////////////////////////////////////////////////
// CLEAN TEXT
//////////////////////////////////////////////////////
function clean(text) {
    return text
        .replace(/\s+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

//////////////////////////////////////////////////////
// AI QUESTIONS (unchanged)
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
// UTIL
//////////////////////////////////////////////////////
function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
