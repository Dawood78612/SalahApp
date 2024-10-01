// app.js

let prayerTimesData = [];
let currentDate = new Date();

// Load CSV data when the page loads
window.onload = function() {
  loadCSVData();

  const savedCity = localStorage.getItem('userCity');
  if (savedCity) {
    document.getElementById('city').value = savedCity;
    loadPrayerTimes(savedCity);
  }

  // Request notification permission
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
};

// Event listener for setting the city
document.getElementById('set-city').addEventListener('click', () => {
  const city = document.getElementById('city').value.trim();
  if (city) {
    localStorage.setItem('userCity', city);
    loadPrayerTimes(city);
  } else {
    alert('Please enter a city.');
  }
});

// Event listeners for navigating days
document.getElementById('prev-day').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 1);
  displayPrayerTimes(currentDate);
});

document.getElementById('next-day').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + 1);
  displayPrayerTimes(currentDate);
});

// Function to load CSV data
function loadCSVData() {
  Papa.parse('prayer_times.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      prayerTimesData = results.data;
      // Normalize date strings in the data
      prayerTimesData.forEach(entry => {
        entry.Date = normalizeDateString(entry.Date);
      });
      displayPrayerTimes(currentDate);
    },
    error: function(err) {
      console.error('Error loading CSV data:', err);
    }
  });
}

// Function to load prayer times for a city
function loadPrayerTimes(city) {
  // You can implement additional logic here if needed
  displayPrayerTimes(currentDate);
}

// Function to display prayer times
function displayPrayerTimes(date) {
  displayDates(date);
  displayMoonPhase(date);

  const formattedDate = formatDate(date);
  const city = localStorage.getItem('userCity') || 'Default City';

  // Find the prayer times for the date
  const times = prayerTimesData.find(
    entry => entry.Date === formattedDate
  );

  if (times) {
    const prayerTimesDiv = document.getElementById('prayer-times');
    prayerTimesDiv.innerHTML = `
      <h2>Prayer Times for ${city} on ${formattedDate}</h2>
      <ul>
        <li>Fajr: ${times.Fajr}</li>
        <li>Sunrise: ${times.Sunrise}</li>
        <li>Dhuhr: ${times.Dhuhr}</li>
        <li>Asr: ${times.Asar}</li>
        <li>Maghrib: ${times.Maghrib}</li>
        <li>Isha: ${times.Isha}</li>
      </ul>
    `;

    // Display forbidden times
    displayForbiddenTimes(times);

    // Schedule notifications
    scheduleNotifications(times);
  } else {
    alert('Prayer times not found for the selected date.');
    document.getElementById('prayer-times').innerHTML = '';
  }
}

// Function to normalize date strings from 'Mon 30 Sep 2024' to 'YYYY-MM-DD'
function normalizeDateString(dateStr) {
  const date = new Date(dateStr);
  return formatDate(date);
}

// Function to format date as 'YYYY-MM-DD'
function formatDate(date) {
  const year = date.getFullYear();
  const month = (`0${date.getMonth() + 1}`).slice(-2);
  const day = (`0${date.getDate()}`).slice(-2);
  return `${year}-${month}-${day}`;
}

// Function to display Gregorian date
function displayDates(date) {
  // Gregorian Date
  const gregorianDate = date.toDateString();
  document.getElementById('gregorian-date').innerText = `Gregorian Date: ${gregorianDate}`;

  // Islamic date functionality removed
}

// Function to display moon phase
function displayMoonPhase(date) {
  const formattedDate = formatDate(date);
  const apiKey = 'YOUR_API_KEY'; // Replace with your actual API key
  const apiUrl = `https://api.abstractapi.com/v1/moon/?api_key=${apiKey}&date=${formattedDate}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      const moonPhase = data['moon_phase'];
      document.getElementById('moon-phase').innerText = `Moon Phase: ${moonPhase}`;
    })
    .catch(error => {
      console.error('Error fetching moon phase:', error);
      document.getElementById('moon-phase').innerText = 'Moon Phase: Data not available';
    });
}

// Function to schedule notifications
function scheduleNotifications(times) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const prayerNames = ['Fajr', 'Dhuhr', 'Asar', 'Maghrib', 'Isha'];

    prayerNames.forEach(prayer => {
      const timeString = times[prayer];
      if (timeString) {
        const prayerTime = new Date(currentDate);
        const [hours, minutes] = timeString.split(':');
        prayerTime.setHours(parseInt(hours), parseInt(minutes), 0);

        const timeDifference = prayerTime - new Date();
        if (timeDifference > 0) {
          setTimeout(() => {
            new Notification(`Time for ${prayer} prayer.`);
          }, timeDifference);
        }
      }
    });
  }
}

// Function to display forbidden prayer times
function displayForbiddenTimes(times) {
  const forbiddenTimesDiv = document.createElement('div');
  forbiddenTimesDiv.innerHTML = `
    <h3>Times When Prayer is Not Allowed:</h3>
    <ul>
      <li>Before Sunrise: ${times.Sunrise}</li>
      <li>Midday (Zenith): ${calculateMidday(times)}</li>
      <li>Before Sunset: ${calculateBeforeSunset(times)}</li>
    </ul>
  `;
  document.getElementById('prayer-times').appendChild(forbiddenTimesDiv);
}

// Helper function to calculate midday (approximate)
function calculateMidday(times) {
  const fajrTime = times.Fajr;
  const maghribTime = times.Maghrib;

  const fajrDate = new Date(currentDate);
  const maghribDate = new Date(currentDate);

  const [fajrHours, fajrMinutes] = fajrTime.split(':');
  fajrDate.setHours(parseInt(fajrHours), parseInt(fajrMinutes), 0);

  const [maghribHours, maghribMinutes] = maghribTime.split(':');
  maghribDate.setHours(parseInt(maghribHours), parseInt(maghribMinutes), 0);

  const middayTime = new Date((fajrDate.getTime() + maghribDate.getTime()) / 2);
  return formatTime(middayTime);
}

// Helper function to calculate time before sunset (e.g., 15 minutes before Maghrib)
function calculateBeforeSunset(times) {
  const maghribTime = times.Maghrib;
  const maghribDate = new Date(currentDate);

  const [hours, minutes] = maghribTime.split(':');
  maghribDate.setHours(parseInt(hours), parseInt(minutes) - 15, 0); // 15 minutes before Maghrib

  return formatTime(maghribDate);
}

// Helper function to format time as HH:MM
function formatTime(date) {
  const hours = (`0${date.getHours()}`).slice(-2);
  const minutes = (`0${date.getMinutes()}`).slice(-2);
  return `${hours}:${minutes}`;
}
