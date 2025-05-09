const container = document.getElementById('container');
const table = document.getElementById('table');

const baseUrl = 'https://mnqxvqrcrg2ffulyml22jjldey0uybbr.lambda-url.ap-southeast-2.on.aws';

const clearTimers = () => {
  const cachedTimers = localStorage.getItem('timers');
  if (cachedTimers) {
    const timers = JSON.parse(cachedTimers);
    timers.forEach((t) => clearTimeout(t));
  }
  localStorage.removeItem('timers');

  const cachedIntervals = localStorage.getItem('intervals');
  if (cachedIntervals) {
    const intervals = JSON.parse(cachedIntervals);
    intervals.forEach((i) => clearInterval(i));
  }
  localStorage.removeItem('intervals');
};

document.addEventListener('close', clearTimers);

window.addEventListener('close', clearTimers);

document.addEventListener('DOMContentLoaded', async () => {
  clearTimers();

  const loader = document.createElement('p');
  loader.classList.add('loader');
  loader.textContent = 'Loading...';

  container.insertAdjacentElement('afterbegin', loader);

  try {
    const response = await fetch(`${baseUrl}/files`);

    if (response.status === 200) {
      const files = await response.json();
      loader.remove();

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

        const tableBody = table.querySelector('tbody');
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
  } catch (error) {
    loader.textContent = 'Failed to process request';
  }
});

class FileRequest {
  constructor(link) {
    this.link = link;
    this.requestFile.bind(this);
    this.setTimerForExpiringLink.bind(this);
  }

  async requestFile() {
    this.link.textContent = 'Please wait...';
    this.link.classList.add('disabled');

    const filename = this.link.dataset.filename;
    const response = await fetch(`${baseUrl}?file=${filename}`);
    const json = await response.json();
    const { url: fileUrl, expiringIn: expiringInMs } = json;

    this.link.textContent = 'Request';
    this.link.classList.remove('disabled');

    const downloadLink = this.link.nextElementSibling;
    downloadLink.classList.remove('hidden');
    downloadLink.setAttribute('href', fileUrl);
    this.link.classList.add('hidden');

    this.expiryLabel = new LinkExpiry(expiringInMs);
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

    const existingIntervals = localStorage.getItem('intervals');
    if (existingIntervals) {
      const intervalsArray = JSON.parse(existingIntervals);
      intervalsArray.push(this.interval);
      localStorage.setItem('intervals', JSON.stringify(intervalsArray));
    }
  }

  parseExpiryTime() {
    const expiryTime = new Date(this.expiringIn).toISOString().split('T')[1].substring(0, 8);

    return expiryTime;
  }

  destroy() {
    clearInterval(this.interval);
    this.element.remove();
  }
}
