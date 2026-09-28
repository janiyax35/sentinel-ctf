/* Threat board / scoreboard with 30s refresh */
(async function () {
  if (!(await App.guard())) return;
  await App.chrome("scoreboard");

  const podium = document.getElementById("podium");
  const table = document.getElementById("table");
  let chart = null;

  async function refresh() {
    let data;
    try { data = await App.api("/api/scoreboard"); }
    catch (e) { return; }
    const rows = data.ranking || [];
    const meId = App.me ? App.me.id : null;

    // podium (top 3)
    const order = [1, 0, 2];
    podium.innerHTML = order.map((idx) => {
      const r = rows[idx];
      const place = idx + 1;
      if (!r) return `<div class="pod p${place}"><div class="ring">${place}</div><div class="nm">—</div></div>`;
      return `<div class="pod p${place}">
        <div class="ring">${place}</div>
        <div class="nm">${App.esc(r.display_name)}</div>
        <div class="sc">${r.score}</div>
      </div>`;
    }).join("");

    // table
    table.innerHTML = `<thead><tr><th>#</th><th>Responder</th><th>Solves</th><th>Score</th></tr></thead>
      <tbody>${rows.map((r, i) => `
        <tr class="${r.user_id === meId ? "me" : ""}">
          <td class="rk">${i + 1}</td>
          <td>${App.esc(r.display_name)}${r.user_id === meId ? " <span class='badge domain' style='padding:1px 6px'>you</span>" : ""}</td>
          <td>${r.solved_count}</td>
          <td class="sc">${r.score}</td>
        </tr>`).join("")}</tbody>`;
    if (!rows.length) table.innerHTML = '<tbody><tr><td><div class="empty">No responders on the board yet.</div></td></tr></tbody>';

    drawChart(data.series || []);
  }

  function drawChart(series) {
    const canvas = document.getElementById("chart");
    if (!canvas || typeof Chart === "undefined") return;
    const palette = ["#FFB547", "#38E1FF", "#8B7CFF", "#3DF5A7", "#FFD166"];
    const datasets = series.slice(0, 5).map((s, i) => ({
      label: s.display_name,
      data: s.points.map((p) => ({ x: p.t, y: p.y })),
      borderColor: palette[i % palette.length],
      backgroundColor: palette[i % palette.length],
      tension: 0.25, pointRadius: 2, borderWidth: 2, stepped: true
    }));
    const fmt = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (chart) { chart.data.datasets = datasets; chart.update(); return; }
    chart = new Chart(canvas, {
      type: "line",
      data: { datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        parsing: false,
        scales: {
          x: { type: "linear", grid: { color: "rgba(34,48,77,.4)" },
               ticks: { color: "#8A9BB8", maxTicksLimit: 6, callback: (v) => fmt(v) } },
          y: { beginAtZero: true, grid: { color: "rgba(34,48,77,.4)" }, ticks: { color: "#8A9BB8" } }
        },
        plugins: {
          legend: { labels: { color: "#E6EDF7", font: { family: "JetBrains Mono" } } },
          tooltip: { callbacks: { title: (items) => items.length ? fmt(items[0].parsed.x) : "" } }
        }
      }
    });
  }

  await refresh();
  setInterval(refresh, 30000);
})();
