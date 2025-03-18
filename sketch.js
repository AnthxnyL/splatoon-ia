let video;
let hands;
let drawing = [];
let brushColors = ['red', 'green']; // Couleurs fixes pour chaque main
let brushSize = 40; // Épaisseur des traits
let lastPositions = [null, null]; // Tableau pour stocker les dernières positions des doigts pour chaque main
let gallery = document.getElementById('gallery');
let modal = document.getElementById('modal');
let modalImage = document.getElementById('modalImage');
let closeModal = document.getElementsByClassName('close')[0];
let prevButton = document.getElementById('prevButton');
let nextButton = document.getElementById('nextButton');
let currentIndex = 0;
let images = [];
let timer;
let timeLeft = 15; // Temps en secondes pour la partie
let countdown = 5; // Temps en secondes pour le décompte avant le début de la partie
let winnerDisplay = document.getElementById('winnerDisplay'); // Conteneur pour afficher le gagnant
let timerDisplay = document.getElementById('timer'); // Conteneur pour afficher le minuteur
let winnerModal = document.getElementById('winnerModal'); // Fenêtre modale pour afficher le gagnant
let closeWinnerModal = document.getElementsByClassName('closeWinner')[0];
let winnerTitle = document.getElementById('winnerTitle');
let winnerText = document.getElementById('winnerText');
let winnerScores = document.getElementById('winnerScores');
let restartGameButton = document.getElementById('restartGameButton'); // Bouton pour recommencer

function setup() {
    createCanvas(860, 640);
    video = createCapture(VIDEO);
    video.size(860, 640);
    video.hide();

    hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
    hands.setOptions({
        maxNumHands: 2, // Permettre la détection de deux mains
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    hands.onResults(gotHands);

    let camera = new Camera(video.elt, {
        onFrame: async () => {
            await hands.send({image: video.elt});
        },
        width: 640,
        height: 480
    });
    camera.start();

    document.getElementById('clearButton').addEventListener('click', clearDrawing);
    document.getElementById('screenshotButton').addEventListener('click', takeScreenshot);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    restartGameButton.addEventListener('click', restartGame); // Ajouter un écouteur pour le bouton recommencer

    closeModal.onclick = function() {
        modal.style.display = 'none';
    }

    closeWinnerModal.onclick = function() {
        winnerModal.style.display = 'none';
    }

    prevButton.onclick = function() {
        changeImage(-1);
    }

    nextButton.onclick = function() {
        changeImage(1);
    }

    // Démarrer le décompte avant de commencer le minuteur
    startCountdown();
}

function gotHands(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            let hand = results.multiHandLandmarks[i];
            let indexFinger = hand[8]; // Utiliser l'index pour chaque main
            let x = indexFinger.x * width;
            let y = indexFinger.y * height;

            let color = brushColors[i];

            if (lastPositions[i]) {
                drawing.push({ x1: lastPositions[i].x, y1: lastPositions[i].y, x2: x, y2: y, color: color });
            }
            lastPositions[i] = { x, y };
        }
    } else {
        lastPositions = [null, null];
    }
}

function draw() {
    image(video, 0, 0, width, height);
    strokeWeight(brushSize);
    for (let p of drawing) {
        stroke(p.color);
        line(p.x1, p.y1, p.x2, p.y2);
    }
    updateColorPercentages();
}

function clearDrawing() {
    drawing = [];
    updateColorPercentages();
    winnerDisplay.innerText = ''; // Réinitialiser l'affichage du gagnant
}

function takeScreenshot() {
    let img = createImg(canvas.toDataURL(), '');
    img.parent(gallery);
    img.style('width', '100px');
    img.style('margin', '5px');
    img.mouseClicked(showModal);
    images.push(img.elt.src);
    currentIndex = images.length - 1;
}

function showModal() {
    currentIndex = images.indexOf(this.elt.src);
    modal.style.display = 'block';
    modalImage.src = images[currentIndex];
}

function changeImage(offset) {
    currentIndex = (currentIndex + offset + images.length) % images.length;
    modalImage.src = images[currentIndex];
}

function updateColorPercentages() {
    let colorCounts = { 'red': 0, 'green': 0 };
    let totalPixels = 0;

    for (let p of drawing) {
        let distance = dist(p.x1, p.y1, p.x2, p.y2);
        totalPixels += distance;
        if (colorCounts[p.color] !== undefined) {
            colorCounts[p.color] += distance;
        }
    }

    let percentages = {};
    for (let color in colorCounts) {
        percentages[color] = totalPixels > 0 ? (colorCounts[color] / totalPixels * 100).toFixed(2) : 0;
    }

    let colorPercentageDisplay = document.getElementById('colorPercentages');
    colorPercentageDisplay.innerHTML = '';
    for (let color in percentages) {
        let div = document.createElement('div');
        div.style.color = color;
        div.innerText = `Couleur ${color}: ${percentages[color]}%`;
        colorPercentageDisplay.appendChild(div);
    }
}

function startCountdown() {
    let countdownOverlay = document.createElement('div');
    countdownOverlay.id = 'countdownOverlay';
    countdownOverlay.innerHTML = `<div id="countdownText">${countdown}</div>`;
    document.body.appendChild(countdownOverlay);

    let countdownText = document.getElementById('countdownText');

    let countdownTimer = setInterval(() => {
        countdown--;
        countdownText.innerText = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownTimer);
            document.body.removeChild(countdownOverlay);
            startTimer(); // Démarrer le minuteur de la partie
            clearDrawing();
        }
    }, 1000);
}



function startTimer() {
    timeLeft = 15; // 15 secondes
    timer = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = `Temps restant: ${timeLeft}s`; // Mettre à jour le contenu de la div du minuteur
        if (timeLeft <= 0) {
            clearInterval(timer);
            takeScreenshot(); // Prendre un screenshot à la fin du temps
            determineWinner(); // Déterminer et afficher le gagnant
            clearDrawing(); // Effacer le dessin
        }
    }, 1000);
}

function determineWinner() {
    let colorCounts = { 'red': 0, 'green': 0 };
    let totalPixels = 0;

    for (let p of drawing) {
        let distance = dist(p.x1, p.y1, p.x2, p.y2);
        totalPixels += distance;
        if (colorCounts[p.color] !== undefined) {
            colorCounts[p.color] += distance;
        }
    }

    let winnerColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
    let percentages = {};
    for (let color in colorCounts) {
        percentages[color] = totalPixels > 0 ? (colorCounts[color] / totalPixels * 100).toFixed(2) : 0;
    }

    winnerTitle.innerText = `Gagnant: Couleur ${winnerColor}`;
    winnerText.innerText = `La couleur ${winnerColor} a gagné avec ${percentages[winnerColor]}% des pixels dessinés.`;
    winnerScores.innerHTML = '';
    for (let color in percentages) {
        let div = document.createElement('div');
        div.style.color = color;
        div.innerText = `Couleur ${color}: ${percentages[color]}%`;
        winnerScores.appendChild(div);
    }

    winnerModal.style.display = 'block'; // Afficher la fenêtre modale du gagnant
}

function restartGame() {
    clearInterval(timer);
    countdown = 5;
    startCountdown();
    clearDrawing(); // Effacer le dessin
    winnerModal.style.display = 'none'; // Fermer la fenêtre modale du gagnant
}
