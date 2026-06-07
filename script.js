// Variables globales de estado del Quiz
let quizData = null;
let userAnswers = {}; // Guardará { questionIndex: optionIndex }
let currentPage = 0;

// Elementos del DOM
const quizTitle = document.getElementById('quiz-title');
const quizContent = document.getElementById('quiz-content');
const paginationControls = document.getElementById('pagination-controls');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageIndicator = document.getElementById('page-indicator');
const submitBtn = document.getElementById('submit-btn');
const resultContainer = document.getElementById('result-container');

// 1. Cargar el JSON al iniciar
document.addEventListener('DOMContentLoaded', () => {
    fetch('quiz1.json')
        .then(response => {
            if (!response.ok) throw new Error('No se pudo cargar el archivo JSON');
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
});

// 2. Inicializar la configuración de la Web
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

    // Si es autocorrect puro, el botón de verificar general puede no ser necesario, 
    // pero lo dejamos para mostrar el "Scoring" final si el usuario quiere terminar.
    submitBtn.addEventListener('click', verifyQuiz);
}

// 3. Renderizar preguntas en el DOM
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

// 4. Manejar el clic en una opción (Lógica Central de Flags)
function handleOptionClick(qIndex, oIndex) {
    const config = quizData.config;
    const questionBlock = document.querySelector(`.question-block[data-index="${qIndex}"]`);
    const buttons = questionBlock.querySelectorAll('.option-btn');

    // Si ya fue respondida en modo autocorrect, salir.
    if (config.autocorrect && userAnswers[qIndex] !== undefined) return;

    // Guardar respuesta del usuario
    userAnswers[qIndex] = oIndex;

    // --- CASO A: Autocorrect activado ---
    if (config.autocorrect) {
        const correctAnswer = quizData.questions[qIndex].correctAnswer;
        
        buttons.forEach((btn, idx) => {
            btn.disabled = true; // Bloquear opciones, no se puede modificar
            
            if (idx === oIndex) {
                // Estilo para la opción que eligió el usuario
                btn.classList.add(idx === correctAnswer ? 'correct' : 'incorrect');
            }
            
            // Regla: si falló y showCorrect está activo, marcar también la verdadera
            if (config.showCorrect && idx === correctAnswer && oIndex !== correctAnswer) {
                btn.classList.add('correct');
            }
        });
    } 
    // --- CASO B: Sin Autocorrect (Modo normal, se verifica al final) ---
    else {
        buttons.forEach((btn, idx) => {
            if (idx === oIndex) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }
}

// 5. Gestión de Páginas (Flag: onePage)
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

    // Deshabilitar botones en los extremos
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === quizData.questions.length - 1;
}

// Eventos de los botones de paginación
prevBtn.addEventListener('click', () => {
    if (currentPage > 0) showPage(currentPage - 1);
});

nextBtn.addEventListener('click', () => {
    if (currentPage < quizData.questions.length - 1) showPage(currentPage + 1);
});

// 6. Verificación General (Al pulsar el botón final)
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

        // Si NO tenía autocorrect, es momento de revelar los estilos visuales en base a showCorrect
        if (!config.autocorrect) {
            buttons.forEach((btn, idx) => {
                btn.disabled = true; // Bloquear todo al terminar

                if (config.showCorrect) {
                    // Mostrar verde la correcta y rojo la del usuario si falló
                    if (idx === correctAnswer) {
                        btn.classList.add('correct');
                    }
                    if (idx === userSelection && userSelection !== correctAnswer) {
                        btn.classList.add('incorrect');
                    }
                } else {
                    // Si showCorrect es false, solo mostramos si el bloque entero está bien o mal de forma sutil
                    if (idx === userSelection) {
                        btn.classList.add(userSelection === correctAnswer ? 'correct' : 'incorrect');
                    }
                }
            });
        }
    });

    // Mostrar el cuadro de resultados final
    resultContainer.innerHTML = `Quiz finalizada.<br>Tu puntuación es: <strong>${score} / ${totalQuestions}</strong>`;
    resultContainer.classList.remove('hidden');
    
    // Si estaba en modo OnePage, quitamos la paginación para que el usuario pueda hacer "Review" de todo el documento de golpe
    if (config.onePage && !config.autocorrect) {
        document.querySelectorAll('.question-block').forEach(b => b.classList.remove('hidden'));
        paginationControls.classList.add('hidden');
    }
    
    submitBtn.disabled = true;
}