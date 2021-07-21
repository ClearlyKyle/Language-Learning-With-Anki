/* https://github.com/buzz-js/buzz-notify */

(() => {
    const cssText = `
    #notify {
      position: relative;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      width: 10vw;
    }
    #notify [data-notify] {
      position: fixed;
    }
    #notify [data-notify="top left"] {
      top: 10px;
      left: 10px;
    }
    #notify [data-notify="top center"] {
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
    }
    #notify [data-notify="top right"] {
      top: 10px;
      right: 10px;
    }
    #notify [data-notify="bottom left"] {
      bottom: 10px;
      left: 10px;
    }
    #notify [data-notify="bottom center"] {
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
    }
    #notify [data-notify="bottom right"] {
      bottom: 10px;
      right: 10px;
    }
    #notify [data-notify~="top"] .animate {
      opacity: 0;
      margin-top: -10px;
    }
    #notify [data-notify~="bottom"] .animate {
      opacity: 0;
      margin-bottom: -10px;
    }
    #notify .notify {
      padding: 0.25rem 0.75rem;
      margin-bottom: 1rem;
      border: 1px solid transparent;
      border-radius: 0.25rem;
      transition: all 300ms ease 0s;
      user-select: none;
      cursor: pointer;
    }
    #notify .notify__title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-direction: row-reverse;
    }
    #notify .notify__title svg {
      margin-right: 7.5px;
    }
    #notify .notify--success {
      color: #155724;
      background-color: #d4edda;
      border-color: #c3e6cb;
    }
    #notify .notify--danger {
      color: #721c24;
      background-color: #f8d7da;
      border-color: #f5c6cb;
    }
    #notify .notify--warning {
      color: #856404;
      background-color: #fff3cd;
      border-color: #ffeeba;
    }
    `;
  
    const styleNode = document.createElement("style");
    styleNode.setAttribute("type", 'text/css');
  
    if (!!(window.attachEvent && !window.opera)) {
      styleNode.styleSheet.cssText = cssText;
    } else {
      const styleText = document.createTextNode(cssText);
      styleNode.appendChild(styleText);
    }
  
    document.getElementsByTagName("head")[0].appendChild(styleNode);
  })();
  
  /**
   * Show a notification
   * @param {Object} options - Here are the keys that you can use if you pass an object.
   * @param {String} options.title - Title of the notification
   * @param {DOMString} [options.html] - Sets the HTML markup contained within the notification.
   * @param {String} [options.type] - Can be 'success', 'danger', 'warning'
   * @param {String} [options.position] - Notification position, can be  'top left', 'top right', 'top center', 'bottom left', 'bottom center', or 'bottom right'.
   * @param {Number} [options.duration] - Auto close notification. Set in ms (milliseconds). If the duration is a negative number, the notification will not be removed.
   * @param {Function} [callback] - This function is executed if the duration is defined and it ends
   */
  function Notify(
    {
      title,
      html = null,
      type = "success",
      position = "top right",
      duration = 3000,
    },
    callback
  ) {
    // Create HTML element
    const notity = document.getElementById("notify");
  
    if (!document.querySelector(`[data-notify='${position}']`)) {
      const notifyWrapper = document.createElement("div");
      notifyWrapper.setAttribute("data-notify", position);
      notity.appendChild(notifyWrapper);
    }
  
    const notifyWrapper = document.querySelector(`[data-notify='${position}']`);
  
    const notifyContent = document.createElement("div");
    notifyContent.setAttribute("class", `notify notify--${type}`);
  
    notifyContent.classList.add("animate");
    setTimeout(() => notifyContent.classList.remove("animate"), 300);
  
    notifyContent.innerHTML = `
          <div class="notify__title" style="font-weight: 700;color: #0b2e13;">${title}</div>
          ${html !== null ? html : ""}
      `;
  
    const notifyTitle = notifyContent.querySelector(".notify__title");
  
    switch (type) {
      case "success":
        notifyTitle.innerHTML += `
      <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-circle-check" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="#155724" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z"/>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12l2 2l4 -4" />
      </svg>`;
        break;
      case "warning":
        notifyTitle.innerHTML += `
        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-alert-circle" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="#856404" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z"/>
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>`;
        break;
      case "danger":
        notifyTitle.innerHTML += `
        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-alert-triangle" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="#721c24" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z"/>
          <path d="M12 9v2m0 4v.01" />
          <path d="M5.07 19H19a2 2 0 0 0 1.75 -2.75L13.75 4a2 2 0 0 0 -3.5 0L3.25 16.25a2 2 0 0 0 1.75 2.75" />
        </svg>`;
    }
  
    if (position.split(" ")[0] === "top") {
      notifyWrapper.insertAdjacentElement("afterbegin", notifyContent);
    }
  
    if (position.split(" ")[0] === "bottom") {
      notifyWrapper.insertAdjacentElement("beforeend", notifyContent);
    }
  
    if (duration * 1 > 0) {
      setTimeout(() => {
        if (typeof callback === "function") callback();
        notifyContent.remove();
      }, duration);
    }
  
    notifyContent.addEventListener("click", function () {
      this.remove();
    });
  }