const topicInput = document.getElementById("topicInput");
const searchButton = document.getElementById("searchButton");
const questionButton = document.getElementById("questionButton");

const resultDiv = document.getElementById("result");
const questionsDiv = document.getElementById("questions");

let currentAbstract = "";

searchButton.addEventListener("click", searchArticle);

questionButton.addEventListener("click", generateQuestions);

topicInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchArticle();
    }
});

async function searchArticle() {

    const topic = topicInput.value.trim();

    if (!topic) {
        resultDiv.innerHTML =
            `<p class="loading">Please enter a topic.</p>`;
        return;
    }

    questionsDiv.innerHTML = "";
    questionButton.disabled = true;

    resultDiv.innerHTML =
        `<p class="loading">Loading articles...</p>`;

    try {

        const url =
            `https://doaj.org/api/search/articles/${encodeURIComponent(topic)}?pageSize=100`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("API request failed");
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            resultDiv.innerHTML =
                `<p class="loading">No articles found.</p>`;
            return;
        }

        const englishArticles = data.results.filter(article => {
            const languages =
                article.bibjson?.language || [];

            return languages.includes("English");
        });

        const articlesToUse =
            englishArticles.length > 0
                ? englishArticles
                : data.results;

        const randomArticle =
            articlesToUse[
                Math.floor(Math.random() * articlesToUse.length)
            ];

        displayArticle(randomArticle);

    } catch (error) {

        console.error(error);

        resultDiv.innerHTML =
            `<p class="loading">Failed to load articles.</p>`;
    }
}

function displayArticle(article) {

    const bib = article.bibjson || {};

    const title =
        bib.title || "No title available";

    const abstract =
        bib.abstract || "No abstract available.";

    currentAbstract = abstract;

    questionButton.disabled = false;

    const journal =
        bib.journal?.title || "Unknown journal";

    const year =
        bib.year || "Unknown year";

    const authors =
        (bib.author || [])
            .map(author => author.name)
            .join(", ") || "Unknown authors";

    let articleUrl = "#";

    if (bib.link && bib.link.length > 0) {
        articleUrl = bib.link[0].url;
    }

    resultDiv.innerHTML = `
        <div class="card">

            <div class="title">
                ${escapeHtml(title)}
            </div>

            <div class="meta">
                <strong>Authors:</strong>
                ${escapeHtml(authors)}
                <br>

                <strong>Journal:</strong>
                ${escapeHtml(journal)}
                <br>

                <strong>Year:</strong>
                ${escapeHtml(year)}
            </div>

            <div class="abstract">
                ${escapeHtml(abstract)}
            </div>

            <br><br>

            <a href="${articleUrl}" target="_blank">
                View Article
            </a>

        </div>
    `;
}

function generateQuestions() {

    if (!currentAbstract) {
        return;
    }

    questionsDiv.innerHTML = "";

    const sentences =
        currentAbstract
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 40);

    if (sentences.length === 0) {

        questionsDiv.innerHTML = `
            <div class="card">
                Not enough text to generate questions.
            </div>
        `;

        return;
    }

    const chosen =
        sentences[Math.floor(Math.random() * sentences.length)];

    const words =
        chosen.split(" ")
            .filter(w => w.length > 5);

    if (words.length === 0) {
        return;
    }

    const answer =
        words[Math.floor(Math.random() * words.length)];

    const blanked =
        chosen.replace(answer, "_____");

    const fakeChoices = generateFakeChoices(answer);

    const allChoices =
        shuffle([
            answer,
            ...fakeChoices
        ]);

    const correctLetter =
        ["A", "B", "C", "D"][
            allChoices.indexOf(answer)
        ];

    questionsDiv.innerHTML = `
        <div class="card">

            <h2>SAT-Style Practice Question</h2>

            <div class="question-box">

                <div class="question-title">
                    Which choice best completes the sentence?
                </div>

                <div>
                    ${escapeHtml(blanked)}
                </div>

                <br>

                ${allChoices.map((choice, index) => `
                    <div class="choice">
                        <strong>
                            ${["A","B","C","D"][index]}.
                        </strong>

                        ${escapeHtml(choice)}
                    </div>
                `).join("")}

                <div class="answer">
                    Correct Answer: ${correctLetter}
                </div>

            </div>

        </div>
    `;
}

function generateFakeChoices(realWord) {

    const pool = [
        "analysis",
        "research",
        "development",
        "evidence",
        "structure",
        "education",
        "community",
        "technology",
        "behavior",
        "environment",
        "response",
        "population"
    ];

    const filtered =
        pool.filter(word =>
            word.toLowerCase() !==
            realWord.toLowerCase()
        );

    return shuffle(filtered).slice(0, 3);
}

function shuffle(array) {

    return [...array].sort(() => Math.random() - 0.5);
}

function escapeHtml(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}
