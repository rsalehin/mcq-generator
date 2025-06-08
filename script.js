document.addEventListener('DOMContentLoaded', () => {
    // Global variable to hold the parsed questions
    let quizQuestions = [];

    const fileUpload = document.getElementById('file-upload');
    const loadBtn = document.getElementById('load-btn');
    const statusMsg = document.getElementById('status-msg');
    const uploadContainer = document.getElementById('upload-container');
    const quizContainer = document.getElementById('quiz-container');

    loadBtn.addEventListener('click', () => {
        const file = fileUpload.files[0];
        if (!file) {
            statusMsg.textContent = "Please select a file first.";
            statusMsg.style.color = 'red';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const fileContent = event.target.result;
            const fileName = file.name.toLowerCase();

            try {
                if (fileName.endsWith('.json')) {
                    quizQuestions = parseJson(fileContent);
                } else if (fileName.endsWith('.xml')) {
                    quizQuestions = parseXml(fileContent);
                } else {
                    throw new Error("Unsupported file type. Please use JSON or XML.");
                }

                if (quizQuestions.length === 0) {
                    throw new Error("No valid questions found in the file. Check format.");
                }

                statusMsg.textContent = `✅ Successfully loaded ${quizQuestions.length} questions!`;
                statusMsg.style.color = 'green';
                displayQuiz(quizQuestions);

            } catch (e) {
                statusMsg.textContent = `❌ Error: ${e.message}`;
                statusMsg.style.color = 'red';
            }
        };
        reader.onerror = function() {
            statusMsg.textContent = '❌ Error reading file.';
            statusMsg.style.color = 'red';
        };
        reader.readAsText(file);
    });

    function parseJson(content) {
        const data = JSON.parse(content);
        let questionsData = [];
        if (Array.isArray(data)) {
            questionsData = data;
        } else if (typeof data === 'object' && data.questions) {
            questionsData = data.questions;
        }

        const validated = questionsData.filter(q =>
            q.question && q.options && Array.isArray(q.options) && q.options.length >= 2 && q.answer
        );
        return validated;
    }

    function parseXml(content) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const questions = [];

        const questionNodes = xmlDoc.querySelectorAll('question, item');
        questionNodes.forEach(node => {
            const questionText = (node.querySelector('text') || node.querySelector('question'))?.textContent;
            const answerText = (node.querySelector('answer') || node.querySelector('correct'))?.textContent;
            const optionNodes = (node.querySelector('options') || node.querySelector('choices'))?.querySelectorAll('option, choice');

            if (questionText && answerText && optionNodes && optionNodes.length >= 2) {
                const options = Array.from(optionNodes).map(opt => opt.textContent.trim());
                questions.push({
                    question: questionText.trim(),
                    options: options,
                    answer: answerText.trim()
                });
            }
        });
        return questions;
    }

    function displayQuiz(questions) {
        uploadContainer.style.display = 'none';
        quizContainer.style.display = 'block';

        let html = `
            <div class="quiz-header">
                <h1>📝 Multiple Choice Quiz</h1>
                <p>Test your knowledge with ${questions.length} questions</p>
            </div>
            <form id="quizForm">
        `;

        questions.forEach((q, i) => {
            html += `
                <div class="question-block">
                    <h3><span class="question-number">Q${i+1}</span>${q.question}</h3>
                    <div class="options-div">
            `;
            q.options.forEach((option, j) => {
                const optionLetter = String.fromCharCode(65 + j);
                html += `
                    <label class="option-label">
                        <input type="radio" name="q${i}" value="${option}">
                        <span class="option-letter">${optionLetter}.</span>
                        <span>${option}</span>
                    </label>
                `;
            });
            html += `</div></div>`;
        });

        html += `
                <div style="text-align: center; margin-top: 40px;">
                    <button type="submit" class="btn btn-primary">🚀 Submit Quiz</button>
                </div>
            </form>
            <div id="results"></div>
        `;

        quizContainer.innerHTML = html;

        // Add event listener to the newly created form
        document.getElementById('quizForm').addEventListener('submit', event => {
            event.preventDefault(); // Prevent default form submission
            handleSubmit(questions);
        });
    }

    function handleSubmit(questions) {
        const form = document.getElementById('quizForm');
        const formData = new FormData(form);
        const userAnswers = {};
        let answeredQuestions = 0;

        for (const [key, value] of formData.entries()) {
            userAnswers[key] = value;
            answeredQuestions++;
        }

        if (answeredQuestions < questions.length) {
            alert(`⚠️ Please answer all questions before submitting! You have answered ${answeredQuestions} out of ${questions.length} questions.`);
            return;
        }

        let score = 0;
        const feedback = questions.map((question, index) => {
            const userAnswer = userAnswers[`q${index}`];
            const isCorrect = userAnswer === question.answer;
            if (isCorrect) {
                score++;
            }
            return {
                question: question.question,
                userAnswer: userAnswer,
                correctAnswer: question.answer,
                isCorrect: isCorrect
            };
        });

        displayResults(score, questions.length, feedback);
    }

    function displayResults(score, total, feedback) {
        const percentage = Math.round((score / total) * 100);
        let resultsHtml = `
            <div class="results-summary">
                <h2>🎉 Quiz Complete!</h2>
                <div class="score-card">
                    <div class="score-text">${score}/${total}</div>
                    <div class="percentage-text">${percentage}%</div>
                </div>
            </div>
            <div>
                <h3 style="text-align:center; margin-bottom:20px;">📊 Detailed Results</h3>
        `;

        feedback.forEach((item, index) => {
            const icon = item.isCorrect ? '✅' : '❌';
            resultsHtml += `
                <div class="feedback-block ${item.isCorrect ? 'correct' : 'incorrect'}">
                    <div style="font-weight: bold; margin-bottom: 10px;">${icon} Question ${index + 1}</div>
                    <div style="font-style: italic; margin-bottom: 10px;">"${item.question}"</div>
                    <div style="margin-bottom: 5px;"><strong>Your answer:</strong> ${item.userAnswer}</div>
                    <div><strong>Correct answer:</strong> ${item.correctAnswer}</div>
                </div>
            `;
        });

        resultsHtml += `
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <button onclick="location.reload()" class="btn btn-primary" style="background: #555;">🔄 Take Another Quiz</button>
            </div>
        `;
        
        quizContainer.innerHTML = `<div id="results">${resultsHtml}</div>`;
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }
});