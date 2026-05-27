const topicInput = document.getElementById("topicInput");
const searchButton = document.getElementById("searchButton");
const resultDiv = document.getElementById("result");

searchButton.addEventListener("click", searchArticle);

topicInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchArticle();
    }
});

async function searchArticle() {
    const topic = topicInput.value.trim();

    if (!topic) {
        resultDiv.innerHTML = `
            <p class="loading">
                Please enter a topic.
            </p>
        `;
        return;
    }

    resultDiv.innerHTML = `
        <p class="loading">
            Loading articles...
        </p>
    `;

    try {
        const url =
            `https://doaj.org/api/search/articles/${encodeURIComponent(topic)}?pageSize=100`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("API request failed");
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            resultDiv.innerHTML = `
                <p class="loading">
                    No articles found.
                </p>
            `;
            return;
        }

        // Only English articles
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

        resultDiv.innerHTML = `
            <p class="loading">
                Failed to load articles.
            </p>
        `;
    }
}

function displayArticle(article) {
    const bib = article.bibjson || {};

    const title =
        bib.title || "No title available";

    const abstract =
        bib.abstract || "No abstract available.";

    const journal =
        bib.journal?.title || "Unknown journal";

    const year =
        bib.year || "Unknown year";

    const authors =
        (bib.author || [])
            .map(author => author.name)
            .join(", ") || "Unknown authors";

    const keywords =
        (bib.keywords || []).join(", ");

    let articleUrl = "#";
    let pdfUrl = null;

    if (bib.link && bib.link.length > 0) {
        for (const link of bib.link) {

            if (!articleUrl || articleUrl === "#") {
                articleUrl = link.url;
            }

            if (
                link.type === "fulltext" ||
                link.url.toLowerCase().includes(".pdf")
            ) {
                pdfUrl = link.url;
            }
        }
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
                <br>

                ${
                    keywords
                    ? `
                    <strong>Keywords:</strong>
                    ${escapeHtml(keywords)}
                    `
                    : ""
                }
            </div>

            <div class="abstract">
                ${escapeHtml(abstract)}
            </div>

            <br><br>

            <a href="${articleUrl}" target="_blank">
                View Article
            </a>

            ${
                pdfUrl
                ? `
                <br><br>

                <a href="${pdfUrl}" target="_blank">
                    Open PDF
                </a>
                `
                : ""
            }

        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
