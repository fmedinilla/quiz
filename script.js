// Variables globales de estado del Quiz
let quizData = null;
let userAnswers = {}; 
let currentPage = 0;

// Elementos del DOM
const quizSelector = document.getElementById('quiz-selector'); // 🔥 Nuevo
const quizTitle = document.getElementById('quiz-title');
const quizContent = document.getElementById('quiz-content');
const paginationControls = document.getElementById('pagination-controls');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageIndicator = document.getElementById('page-indicator');
const submitBtn = document.getElementById('submit-btn');
const resultContainer = document.getElementById('result-container');

// 1. Escuchar el inicio y el cambio de Quiz en la interfaz
document.addEventListener('DOMContentLoaded', () => {
    // Carga inicial con el valor por defecto del selector (quiz1.json)
    loadQuizData(quizSelector.value);

    // 🔥 Escuchar cuando el usuario cambia de opción en el desplegable
    quizSelector.addEventListener('change', (e) => {
        loadQuizData(e.target.value);
    });
});

// 2. Función para cargar cualquier archivo JSON y resetear el estado
function loadQuizData(jsonFile) {
    // Resetear variables de estado
    userAnswers = {};
    currentPage = 0;
    
    // Resetear elementos visuales de la interfaz
    resultContainer.classList.add('hidden');
    resultContainer.innerHTML = '';
    submitBtn.disabled = true;
    quizTitle.innerText = "Cargando Quiz...";
    quizContent.innerHTML = "";

    // Petición HTTP para traer el JSON seleccionado
    fetch(jsonFile)
        .then(response => {
            if (!response.ok) throw new Error(`No se pudo cargar el archivo ${jsonFile}`);
            return response.json();
        })
        .then(data => {
            quizData = data;
            initQuiz();
        })
        .catch(error => {
            quizTitle.innerText = "Error al cargar la quiz.";
            console.error(error);
        });
}

// 3. Inicializar la configuración de la Web
function initQuiz() {
    quizTitle.innerText = quizData.config.title;
    renderQuestions();

    // Regla: Configuración de OnePage (Paginación)
    if (quizData.config.onePage) {
        paginationControls.classList.remove('hidden');
        showPage(0);
    } else {
        paginationControls.classList.add('hidden');
    }

    // Comprobar el botón de entrega al inicio
    checkQuizCompletion();
}

// 4. Comprueba si se respondieron todas las preguntas
function checkQuizCompletion() {
    const totalQuestions = quizData.questions.length;
    const answeredCount = Object.keys(userAnswers).length;

    if (answeredCount === totalQuestions) {
        submitBtn.disabled = false;
        submitBtn.title = "¡Listo! Puedes enviar tus respuestas.";
    } else {
        submitBtn.disabled = true;
        submitBtn.title = `Por favor, responde todas las preguntas (${answeredCount}/${totalQuestions})`;
    }
}

// 5. Renderizar preguntas en el DOM
function renderQuestions() {
    quizContent.innerHTML = '';

    quizData.questions.forEach((q, qIndex) => {
        const questionBlock = document.createElement('div');
        questionBlock.className = 'question-block';
        questionBlock.setAttribute('data-index', qIndex);

        const qText = document.createElement('div');
        qText.className = 'question-text';
        qText.innerText = `${qIndex + 1}. ${q.question}`;
        questionBlock.appendChild(qText);

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';

        q.options.forEach((option, oIndex) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = option;
            btn.setAttribute('data-q', qIndex);
            btn.setAttribute('data-o', oIndex);
            
            btn.addEventListener('click', () => handleOptionClick(qIndex, oIndex));
            
            optionsContainer.appendChild(btn);
        });

        questionBlock.appendChild(optionsContainer);
        quizContent.appendChild(questionBlock);
    });
}

// 6. Manejar el clic en una opción
function handleOptionClick(qIndex, oIndex) {
    const config = quizData.config;
    const questionBlock = document.querySelector(`.question-block[data-index="${qIndex}"]`);
    const buttons = questionBlock.querySelectorAll('.option-btn');

    if (config.autocorrect && userAnswers[qIndex] !== undefined) return;

    userAnswers[qIndex] = oIndex;

    if (config.autocorrect) {
        const correctAnswer = quizData.questions[qIndex].correctAnswer;
        
        buttons.forEach((btn, idx) => {
            btn.disabled = true; 
            if (idx === oIndex) {
                btn.classList.add(idx === correctAnswer ? 'correct' : 'incorrect');
            }
            if (config.showCorrect && idx === correctAnswer && oIndex !== correctAnswer) {
                btn.classList.add('correct');
            }
        });
    } else {
        buttons.forEach((btn, idx) => {
            if (idx === oIndex) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    checkQuizCompletion();
}

// 7. Gestión de Páginas (Flag: onePage)
function showPage(pageIndex) {
    const blocks = document.querySelectorAll('.question-block');
    blocks.forEach((block, idx) => {
        if (idx === pageIndex) {
            block.classList.remove('hidden');
        } else {
            block.classList.add('hidden');
        }
    });

    currentPage = pageIndex;
    pageIndicator.innerText = `Pregunta ${currentPage + 1} de ${quizData.questions.length}`;

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === quizData.questions.length - 1;
}

// Asignar eventos una sola vez fuera de las funciones dinámicas
prevBtn.onclick = () => { if (currentPage > 0) showPage(currentPage - 1); };
nextBtn.onclick = () => { if (currentPage < quizData.questions.length - 1) showPage(currentPage + 1); };
submitBtn.onclick = verifyQuiz;

// 8. Verificación General
function verifyQuiz() {
    const config = quizData.config;
    let score = 0;
    const totalQuestions = quizData.questions.length;

    quizData.questions.forEach((q, qIndex) => {
        const questionBlock = document.querySelector(`.question-block[data-index="${qIndex}"]`);
        const buttons = questionBlock.querySelectorAll('.option-btn');
        const userSelection = userAnswers[qIndex];
        const correctAnswer = q.correctAnswer;

        if (userSelection === correctAnswer) {
            score++;
        }

        if (!config.autocorrect) {
            buttons.forEach((btn, idx) => {
                btn.disabled = true;

                if (config.showCorrect) {
                    if (idx === correctAnswer) btn.classList.add('correct');
                    if (idx === userSelection && userSelection !== correctAnswer) btn.classList.add('incorrect');
                } else {
                    if (idx === userSelection) {
                        btn.classList.add(userSelection === correctAnswer ? 'correct' : 'incorrect');
                    }
                }
            });
        }
    });

    resultContainer.innerHTML = `Quiz finalizada.<br>Tu puntuación es: <strong>${score} / ${totalQuestions}</strong>`;
    resultContainer.classList.remove('hidden');
    
    if (config.onePage && !config.autocorrect) {
        document.querySelectorAll('.question-block').forEach(b => b.classList.remove('hidden'));
        paginationControls.classList.add('hidden');
    }
    
    submitBtn.disabled = true;
}