const HG_BRASIL_API_KEY = '159fa5ba'; 

document.addEventListener('DOMContentLoaded', () => {
    getWeather();
});

async function getWeather() {
    const city = 'Camaçari'; 
    const state = 'BA'; 
    const apiUrl = `https://api.hgbrasil.com/weather?format=json-cors&key=${HG_BRASIL_API_KEY}&city_name=${city},${state}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.results) {
            updateWeatherUI(data.results);
        } else {
            console.error('Error fetching weather data:', data.message);
            displayErrorMessage('Não foi possível carregar os dados do tempo.');
        }
    } catch (error) {
        console.error('Network error or API call failed:', error);
        displayErrorMessage('Erro ao carregar os dados.');
    }
}

function updateWeatherUI(weatherData) {
    const weatherForecastElement = document.getElementById('weatherForecast');
    const currentWeatherElement = document.getElementById('currentWeather');
    const currentHumidityElement = document.getElementById('currentHumidity');

    if (weatherData.forecast && weatherData.forecast.length > 0) {
        const todayForecast = weatherData.forecast[0];
        weatherForecastElement.textContent = `${todayForecast.description} - ${todayForecast.min}°C / ${todayForecast.max}°C`;
    } else {
        weatherForecastElement.textContent = 'Previsão não disponível.';
    }

    currentWeatherElement.textContent = `${weatherData.temp}°C - ${weatherData.description}`;
    currentHumidityElement.textContent = `Umidade: ${weatherData.humidity}%`;
}

function displayErrorMessage(message) {
    const weatherForecastElement = document.getElementById('weatherForecast');
    const currentWeatherElement = document.getElementById('currentWeather');
    const currentHumidityElement = document.getElementById('currentHumidity');

    weatherForecastElement.textContent = message;
    currentWeatherElement.textContent = 'Erro';
    currentHumidityElement.textContent = ''; // Clear humidity if there's an error
}