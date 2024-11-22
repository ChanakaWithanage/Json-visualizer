document.addEventListener("DOMContentLoaded", () => {
    let jsonData = null;
    const uploadJsonButton = document.getElementById("uploadJsonButton");
    const uploadJsonInput = document.getElementById("uploadJsonInput");
    const exportJsonButton = document.getElementById("exportJsonButton");
    const applyFilterButton = document.getElementById("applyFilterButton");
    const jsonDataContainer = document.getElementById("jsonDataContainer");
    const matchesCountDisplay = document.getElementById("matchesCount");

    // Handle JSON upload
    uploadJsonButton.addEventListener("click", () => {
        uploadJsonInput.click();
    });

    uploadJsonInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    jsonData = JSON.parse(e.target.result); // Parse JSON
                    populateFilterDropdowns(jsonData);     // Populate filters after successful parsing
                    renderJson(jsonData);                   // Render JSON
                } catch (error) {
                    alert("Invalid JSON file.");
                    console.error("JSON Parsing Error:", error);
                }
            };
            reader.readAsText(file); // Read the file as text
        }
    });

    // Populate filter dropdowns
    function populateFilterDropdowns(data) {
        const attributeNames = getAllBaseAttributeNames(data);  // Get base attribute names
        const defaultAttributes = ['id', 'name', 'event', 'possessions'];
        const dropdowns = document.querySelectorAll(".attribute-name");

        dropdowns.forEach((dropdown, index) => {
            dropdown.innerHTML = ""; // Clear existing options

            // Add default attributes first if they exist
            defaultAttributes.forEach((defaultAttr, defaultIndex) => {
                if (attributeNames.includes(defaultAttr)) {
                    const option = document.createElement("option");
                    option.value = defaultAttr;
                    option.textContent = defaultAttr;
                    dropdown.appendChild(option);

                    // Select the default attribute if it's one of the first four dropdowns
                    if (index === defaultIndex) {
                        dropdown.value = defaultAttr;
                    }
                }
            });

            // Add remaining attributes
            attributeNames.forEach((name) => {
                if (!defaultAttributes.includes(name)) {
                    const option = document.createElement("option");
                    option.value = name;
                    option.textContent = name;
                    dropdown.appendChild(option);
                }
            });
        });
    }

    // Get all base attribute names from JSON
    function getAllBaseAttributeNames(data, result = new Set(), parentKey = "") {
        if (typeof data !== "object" || data === null) return result;

        for (const key in data) {
            result.add(key); // Add the full key
            if (typeof data[key] === "object") {
                getAllBaseAttributeNames(data[key], result);
            }
        }
        return Array.from(result).sort();
    }

    // Render JSON with optional highlights
    function renderJsonTree(data, parentElement, parentPath = "", highlightFilters = [], matchedObjects = new Set()) {
        Object.entries(data).forEach(([key, value]) => {
            const fullPath = parentPath ? `${parentPath}.${key}` : key;
            const container = document.createElement("div");
            container.className = "json-line";

            const isHighlighted = highlightFilters.length > 0 && highlightFilters.every(
                (filter) => {
                    const keys = filter.attribute.split(".");
                    let current = data;
                    for (const k of keys) {
                        if (current[k] === undefined) return false;
                        current = current[k];
                    }
                    return String(current).includes(filter.value);
                }
            );

            if (isHighlighted) {
                container.classList.add("highlight");
                matchedObjects.add(data);
            }

            const keyElement = document.createElement("span");
            keyElement.className = "json-key";
            keyElement.textContent = `"${key}": `;

            container.appendChild(keyElement);

            if (typeof value === "object" && value !== null) {
                const valueElement = document.createElement("div");
                valueElement.className = "json-nested";
                renderJsonTree(value, valueElement, fullPath, highlightFilters, matchedObjects);
                container.appendChild(valueElement);
            } else {
                const valueInput = document.createElement("input");
                valueInput.type = "text";
                valueInput.value = value;
                valueInput.dataset.key = fullPath;
                valueInput.addEventListener("input", () => {
                    updateJson(fullPath, valueInput.value); // Update JSON when edited
                });
                container.appendChild(valueInput);
            }

            parentElement.appendChild(container);
        });
    }

    function renderJson(data, highlightFilters = []) {
        jsonDataContainer.innerHTML = ""; // Clear previous content
        const matchedObjects = new Set();
        renderJsonTree(data, jsonDataContainer, "", highlightFilters, matchedObjects);

        // Handle matches count and scrolling
        matchesCountDisplay.textContent = `Matches: ${matchedObjects.size}`;
        if (matchedObjects.size > 0) {
            jsonDataContainer.querySelector(".highlight").scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    // Update JSON value on edit
    function updateJson(path, newValue) {
        const keys = path.split(".");
        let current = jsonData;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }

        const lastKey = keys[keys.length - 1];
        current[lastKey] = newValue;
    }

    // Export JSON
    exportJsonButton.addEventListener("click", () => {
        if (!jsonData) {
            alert("No JSON data to export.");
            return;
        }

        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "exported.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // Apply filters
    applyFilterButton.addEventListener("click", () => {
        if (!jsonData) {
            alert("Please upload JSON data first.");
            return;
        }

        const filters = Array.from(document.querySelectorAll(".filter")).map((filter) => ({
            attribute: filter.querySelector(".attribute-name").value.trim(),
            value: filter.querySelector(".attribute-value").value.trim(),
        }));

        const highlightFilters = filters.filter((filter) => filter.attribute && filter.value);
        renderJson(jsonData, highlightFilters);
    });
});