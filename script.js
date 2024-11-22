document.getElementById("visualize-btn").addEventListener("click", () => {
  const input = document.getElementById("json-input").value;
  const treeContainer = document.getElementById("json-tree");
  const downloadBtn = document.getElementById("download-btn");

  try {
    const json = JSON.parse(input);
    treeContainer.innerHTML = ""; // Clear previous visualization
    renderJSONTree(json, treeContainer);
    downloadBtn.style.display = "inline";
  } catch (e) {
    alert("Invalid JSON!");
  }
});

document.getElementById("download-btn").addEventListener("click", () => {
  const input = document.getElementById("json-input").value;
  const blob = new Blob([input], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  a.click();
  URL.revokeObjectURL(url);
});

function renderJSONTree(obj, container) {
  if (typeof obj !== "object" || obj === null) {
    const textNode = document.createTextNode(obj);
    container.appendChild(textNode);
    return;
  }

  const ul = document.createElement("ul");
  for (const key in obj) {
    const li = document.createElement("li");
    li.textContent = `${key}: `;
    const valueContainer = document.createElement("span");
    renderJSONTree(obj[key], valueContainer);
    li.appendChild(valueContainer);
    ul.appendChild(li);
  }
  container.appendChild(ul);
}
