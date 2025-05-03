const table = document.getElementById('table');

const baseUrl = 'https://yyftnvy2eiwvulsh35op2xk27q0raxra.lambda-url.ap-southeast-2.on.aws';

const clearTimers = () => {
  const cachedTimers = localStorage.getItem('timers');
  if (cachedTimers) {
    const timers = JSON.parse(cachedTimers);
    timers.forEach((t) => clearTimeout(t));
  }
  localStorage.removeItem('timers');
};

document.addEventListener('close', clearTimers);

window.addEventListener('close', clearTimers);

document.addEventListener('DOMContentLoaded', async () => {
  clearTimers();

  const response = await fetch(`${baseUrl}/files`);
  const tableBody = table.querySelector('tbody');

  if (response.status === 200) {
    const files = await response.json();
    for (const f of files) {
      const row = `
        <tr>
            <td>${f}</td>
            <td>
                <a href="#" id="request_${f}" data-filename="${f}" 
                    class="link_request">Request</a>
                <a href="#" id="download_${f}" data-filename="${f}" 
                    class="link_download hidden">Download</a>
            </td>
        </tr>
      `;

      tableBody.insertAdjacentHTML('afterbegin', row);
    }
  }

  const linkRequest = document.querySelectorAll('.link_request');

  linkRequest.forEach((link) =>
    link.addEventListener('click', async function (e) {
      e.preventDefault();
      const fileRequest = new FileRequest(this);
      await fileRequest.requestFile();
    })
  );
});

class FileRequest {
  constructor(link) {
    this.link = link;
    this.requestFile.bind(this);
    this.setTimerForExpiringLink.bind(this);
  }

  async requestFile() {
    const filename = this.link.dataset.filename;
    const response = await fetch(`${baseUrl}?file=${filename}`);
    const json = await response.json();
    const fileUrl = json.url;

    const downloadLink = this.link.nextElementSibling;
    downloadLink.classList.remove('hidden');
    downloadLink.setAttribute('href', fileUrl);
    this.link.classList.add('hidden');

    this.expiryLabel = new LinkExpiry(30 * 1000);
    downloadLink.insertAdjacentElement('afterend', this.expiryLabel.element);
    this.setTimerForExpiringLink();
  }

  setTimerForExpiringLink() {
    const downloadLink = this.link.nextElementSibling;

    const expiringLinkTimer = setTimeout(() => {
      downloadLink.classList.add('hidden');
      downloadLink.setAttribute('href', '');
      this.link.classList.remove('hidden');
      this.expiryLabel.destroy();
    }, this.expiryLabel.expiringIn);

    const existingTimers = localStorage.getItem('timers');
    if (existingTimers) {
      const timersArray = JSON.parse(existingTimers);
      timersArray.push(expiringLinkTimer);
      localStorage.setItem('timers', JSON.stringify(timersArray));
    }

    this.expiryLabel.startExpiryTimer();
  }
}

class LinkExpiry {
  constructor(expiringInMs) {
    this.expiringIn = expiringInMs;
    this.element = document.createElement('span');
    this.element.style.marginLeft = '10px';
    const expiringText = this.parseExpiryTime();
    this.element.textContent = `expiring in ${expiringText}`;
  }

  startExpiryTimer() {
    this.interval = setInterval(() => {
      this.expiringIn -= 1000;
      const expiringText = this.parseExpiryTime();
      this.element.textContent = `expiring in ${expiringText}`;
    }, 1000);
  }

  parseExpiryTime() {
    const expiringInSeconds = Math.floor(this.expiringIn / 1000);
    const expiryMinutes = Math.floor(expiringInSeconds / 60);
    const expirySeconds = expiringInSeconds % 60;

    const expiryTime = new Date(0, 0, 0, 0, expiryMinutes, expirySeconds);
    const minutesText = expiryTime.getMinutes() < 10 ? `0${expiryTime.getMinutes()}` : expiryTime.getMinutes();
    const secondsText = expiryTime.getSeconds() < 10 ? `0${expiryTime.getSeconds()}` : expiryTime.getSeconds();

    const expiryTimeText = `00:${minutesText}:${secondsText}`;
    return expiryTimeText;
  }

  destroy() {
    clearInterval(this.interval);
    this.element.remove();
  }
}
