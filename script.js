document.addEventListener("DOMContentLoaded", () => {
    let jsonData = null;
    let matchedElements = [];
    let currentMatchIndex = -1;
    let activeElementPath = null;
    let activeElementSelection = null;

    const uploadJsonButton = document.getElementById("uploadJsonButton");
    const uploadJsonInput = document.getElementById("uploadJsonInput");
    const exportJsonButton = document.getElementById("exportJsonButton");
    const applyFilterButton = document.getElementById("applyFilterButton");
    const clearFilterButton = document.getElementById("clearFilterButton");
    const goUpButton = document.getElementById("goUpButton");
    const goNextButton = document.getElementById("goNextButton");
    const goToMatchButton = document.getElementById("goToMatchButton");
    const matchNumberInput = document.getElementById("matchNumberInput");
    const jsonDataContainer = document.getElementById("jsonDataContainer");
    const matchesCountDisplay = document.getElementById("matchesCount");

    // Upload event listeners
    uploadJsonButton.addEventListener("click", () => {
        uploadJsonInput.click();
    });

    uploadJsonInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    jsonData = JSON.parse(e.target.result);
                    populateFilterDropdowns(jsonData);
                    renderJson(jsonData);
                } catch (error) {
                    alert("Invalid JSON file.");
                    console.error("JSON Parsing Error:", error);
                }
            };
            reader.readAsText(file);
        }
    });

    function getCurrentFilters() {
        return Array.from(document.querySelectorAll(".filter"))
            .map((filter) => ({
                attribute: filter.querySelector(".attribute-name").value.trim(),
                value: filter.querySelector(".attribute-value").value.trim(),
            }))
            .filter((filter) => filter.attribute && filter.value);
    }

    function populateFilterDropdowns(data) {
        const attributeNames = getAllBaseAttributeNames(data);
        const defaultAttributes = ['id', 'name', 'events', 'posessions'];
        const dropdowns = document.querySelectorAll(".attribute-name");

        dropdowns.forEach((dropdown, index) => {
            dropdown.innerHTML = "";

            defaultAttributes.forEach((defaultAttr, defaultIndex) => {
                if (attributeNames.includes(defaultAttr)) {
                    const option = document.createElement("option");
                    option.value = defaultAttr;
                    option.textContent = defaultAttr;
                    dropdown.appendChild(option);

                    if (index === defaultIndex) {
                        dropdown.value = defaultAttr;
                    }
                }
            });

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

    function getAllBaseAttributeNames(data, result = new Set(), parentKey = "") {
        if (typeof data !== "object" || data === null) return result;

        for (const key in data) {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            result.add(key);
            if (typeof data[key] === "object") {
                getAllBaseAttributeNames(data[key], result, fullKey);
            }
        }
        return Array.from(result).sort();
    }

    function scrollToMatch(index) {
        if (matchedElements.length === 0) return;

        matchedElements.forEach(el => el.classList.remove('current-match'));

        index = ((index % matchedElements.length) + matchedElements.length) % matchedElements.length;
        currentMatchIndex = index;

        matchedElements[currentMatchIndex].classList.add('current-match');

        matchedElements[currentMatchIndex].scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        matchNumberInput.value = currentMatchIndex + 1;
    }

    function checkMatch(data, filter) {
        const keys = filter.attribute.split(".");
        let current = data;

        for (const key of keys) {
            if (current === null || current === undefined || !current.hasOwnProperty(key)) {
                return false;
            }
            current = current[key];
        }

        return String(current).toLowerCase().includes(filter.value.toLowerCase());
    }

    function renderJsonTree(data, parentElement, parentPath = "", highlightFilters = [], isArrayItem = false) {
        const container = document.createElement("div");
        container.className = "json-line";

        let isMatch = false;
        if (highlightFilters.length > 0) {
            isMatch = highlightFilters.every(filter => checkMatch(data, filter));
            if (isMatch) {
                container.classList.add("highlight");
                matchedElements.push(container);
            }
        }

        Object.entries(data).forEach(([key, value]) => {
            const fullPath = parentPath ? `${parentPath}.${key}` : key;

            const keyContainer = document.createElement("div");
            keyContainer.className = "json-line";

            const keyElement = document.createElement("span");
            keyElement.className = "json-key";
            keyElement.textContent = `"${key}": `;
            keyContainer.appendChild(keyElement);

            if (typeof value === "object" && value !== null) {
                const valueElement = document.createElement("div");
                valueElement.className = "json-nested";

                if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        if (typeof item === "object" && item !== null) {
                            renderJsonTree(item, valueElement, `${fullPath}.${index}`, highlightFilters, true);
                        } else {
                            const primitiveContainer = document.createElement("div");
                            primitiveContainer.className = "json-line";
                            const valueInput = createInputElement(item, `${fullPath}.${index}`);
                            primitiveContainer.appendChild(valueInput);
                            valueElement.appendChild(primitiveContainer);
                        }
                    });
                } else {
                    renderJsonTree(value, valueElement, fullPath, highlightFilters, false);
                }

                keyContainer.appendChild(valueElement);
            } else {
                const valueInput = createInputElement(value, fullPath);
                keyContainer.appendChild(valueInput);
            }

            container.appendChild(keyContainer);
        });

        parentElement.appendChild(container);
    }

    function createInputElement(value, fullPath) {
        const valueInput = document.createElement("input");
        valueInput.type = "text";
        valueInput.value = value;
        valueInput.dataset.key = fullPath;

        // If this input matches the active element path, mark it for focus
        if (fullPath === activeElementPath) {
            setTimeout(() => {
                valueInput.focus();
                valueInput.setSelectionRange(
                    activeElementSelection.start,
                    activeElementSelection.end
                );
            }, 0);
        }

        valueInput.addEventListener("focus", () => {
            activeElementPath = fullPath;
        });

        valueInput.addEventListener("input", (e) => {
            const input = e.target;
            activeElementPath = fullPath;
            activeElementSelection = {
                start: input.selectionStart,
                end: input.selectionEnd
            };
            updateJson(fullPath, input.value);
        });

        return valueInput;
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const debouncedUpdateJson = debounce((path, newValue) => {
        const keys = path.split(".");
        let current = jsonData;

        const processedValue = !isNaN(newValue) && newValue !== '' ? Number(newValue) : newValue;

        try {
            for (let i = 0; i < keys.length - 1; i++) {
                if (current[keys[i]] === undefined) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }

            const lastKey = keys[keys.length - 1];
            current[lastKey] = processedValue;

            const currentFilters = getCurrentFilters();
            renderJson(jsonData, currentFilters);
        } catch (error) {
            console.error("Error updating JSON:", error);
        }
    }, 300);

    function updateJson(path, newValue) {
        debouncedUpdateJson(path, newValue);
    }

    function renderJson(data, highlightFilters = []) {
        jsonDataContainer.innerHTML = "";
        matchedElements = [];
        renderJsonTree(data, jsonDataContainer, "", highlightFilters, false);

        matchesCountDisplay.textContent = `Matches: ${matchedElements.length}`;
        currentMatchIndex = matchedElements.length > 0 ? 0 : -1;

        if (currentMatchIndex >= 0) {
            scrollToMatch(currentMatchIndex);
        }
    }

    // Navigation event listeners
    goUpButton.addEventListener("click", () => {
        if (matchedElements.length > 0) {
            scrollToMatch(currentMatchIndex - 1);
        }
    });

    goNextButton.addEventListener("click", () => {
        if (matchedElements.length > 0) {
            scrollToMatch(currentMatchIndex + 1);
        }
    });

    goToMatchButton.addEventListener("click", () => {
        const matchNumber = parseInt(matchNumberInput.value, 10) - 1;
        if (matchNumber >= 0 && matchNumber < matchedElements.length) {
            scrollToMatch(matchNumber);
        } else {
            alert(`Please enter a number between 1 and ${matchedElements.length}`);
        }
    });

    exportJsonButton.addEventListener("click", () => {
        if (!jsonData) {
            alert("No JSON data to export.");
            return;
        }

        try {
            const jsonString = JSON.stringify(jsonData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "exported.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting JSON:", error);
            alert("Error exporting JSON. Please check the console for details.");
        }
    });

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

    clearFilterButton.addEventListener("click", () => {
        document.querySelectorAll(".attribute-value").forEach(input => input.value = "");
        document.querySelectorAll(".attribute-name").forEach(select => {
            select.value = select.querySelector("option").value;
        });
        matchedElements = [];
        currentMatchIndex = -1;
        matchesCountDisplay.textContent = "Matches: 0";
        renderJson(jsonData, []);
        matchNumberInput.value = "";
    });
});