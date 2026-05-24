// Mapa: studentId -> { name, answers: { questionIndex: {answer, correct} } }
const liveFeedData = {};
let liveSource = null;

function initLiveFeed() {
  if (liveSource) liveSource.close();

  liveSource = new EventSource('/api/answers/live-feed');

  liveSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'connected') return;
    if (data.type === 'answer') handleLiveAnswer(data);
  };

  liveSource.onerror = () => {
    // Reconecta automáticamente el navegador
  };
}

function handleLiveAnswer(data) {
  const { studentId, studentName, questionIndex, answer, isCorrect } = data;

  if (!liveFeedData[studentId]) {
    liveFeedData[studentId] = { name: studentName, answers: {} };
  }
  liveFeedData[studentId].answers[questionIndex] = { answer, isCorrect };

  renderLiveFeed();
}

function renderLiveFeed() {
  const grid = document.getElementById('live-feed-grid');

  // Calcular el máximo índice de pregunta respondido
  let maxQ = 0;
  Object.values(liveFeedData).forEach(s => {
    Object.keys(s.answers).forEach(q => {
      if (parseInt(q) > maxQ) maxQ = parseInt(q);
    });
  });

  let html = `<table class="live-table"><thead><tr>
    <th>Estudiante</th>
    ${Array.from({ length: maxQ + 1 }, (_, i) => `<th>P${i + 1}</th>`).join('')}
    <th>Puntos</th>
  </tr></thead><tbody>`;

  Object.values(liveFeedData).forEach(student => {
    const correct = Object.values(student.answers).filter(a => a.isCorrect).length;
    const total = Object.values(student.answers).length;

    html += `<tr>
      <td class="student-name">👤 ${student.name}</td>`;

    for (let i = 0; i <= maxQ; i++) {
      const ans = student.answers[i];
      if (!ans) {
        html += `<td>—</td>`;
      } else {
        const cls = ans.isCorrect ? 'correct' : 'wrong';
        const icon = ans.isCorrect ? '✅' : '❌';
        html += `<td class="${cls}" title="Respondió: ${ans.answer}">${icon}</td>`;
      }
    }

    html += `<td><strong>${correct}/${total}</strong></td></tr>`;
  });

  html += '</tbody></table>';
  grid.innerHTML = html;
}
