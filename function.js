function insertAfter(newElement, targetElement) {
    var parent = targetElement.parentNode;
    if (parent.lastChild == targetElement) {
        parent.appendChild(newElement);
    } else {
        parent.insertBefore(newElement, targetElement.nextSibling);
    }
}

// 导入脚本
function includeScriptElement(scripts) {
    var script = document.createElement("script");
    script.textContent = scripts;
    document.body.appendChild(script);
}

// 导入样式 - 241128[0.2]
function includeStyleElement(styles, id) {
    var existingStyle = id ? document.getElementById(id) : null;
    if (existingStyle) {
        existingStyle.parentNode.removeChild(existingStyle);
    }
    var style = document.createElement("style");
    if (id) {
        style.id = id;
    }
    (document.getElementsByTagName("head")[0] || document.body).appendChild(style);
    if (style.styleSheet) {
        style.styleSheet.cssText = styles;
    } else {
        style.appendChild(document.createTextNode(styles));
    }
}