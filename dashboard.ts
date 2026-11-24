// ДЗ: один файл, который ОДНОВРЕМЕННО получает погоду и курс валют (формат данных — JSON).

// ---------- Типы ответов API (то, что приходит в JSON) ----------

// Описываем, как выглядит JSON-ответ от сервиса погоды (open-meteo)
interface Weather {
  // Блок "current" — текущая погода
  current: {
    time: string; // время измерения; open-meteo отдаёт строку ISO, например "2026-11-24T12:00"
    temperature_2m: number; // температура воздуха на высоте 2 м, в °C
    wind_speed_10m: number; // скорость ветра на высоте 10 м, в км/ч
  };
} // конец описания Weather

// Описываем, как выглядит JSON-ответ от сервиса курсов валют (open.er-api.com)
interface Rates {
  result: string; // "success", если всё хорошо
  base_code: string; // базовая валюта, относительно которой даны курсы (у нас USD)
  rates: Record<string, number>; // словарь вида { "KZT": 454.8, "EUR": 0.91, ... }: код валюты -> курс
} // конец описания Rates

// ---------- Запросы ----------

// Функция получения погоды; async значит, что она возвращает Promise (результат придёт позже)
async function getWeather(): Promise<Weather> {
  // Адрес API: координаты Алматы (latitude/longitude) и какие параметры погоды нужны (current=...)
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=43.24&longitude=76.89&current=temperature_2m,wind_speed_10m";
  // Отправляем HTTP-запрос и ждём ответ (await — «подожди, пока придёт»)
  const response = await fetch(url);
  // response.ok равно false, если сервер вернул ошибку (404, 500 и т.д.)
  if (!response.ok) {
    // Прерываем функцию с понятным сообщением об ошибке
    throw new Error(`Погода: HTTP ${response.status}`);
  } // конец проверки ошибки
  // response.json() превращает JSON-текст в объект; "as Weather" говорит TypeScript, какого он типа
  return (await response.json()) as Weather;
} // конец getWeather

// Функция получения курсов валют
async function getRates(): Promise<Rates> {
  // Запрашиваем курсы всех валют относительно доллара (USD)
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  // Если сервер вернул ошибку — сообщаем об этом
  if (!response.ok) {
    // Бросаем ошибку с кодом HTTP-ответа
    throw new Error(`Курсы: HTTP ${response.status}`);
  } // конец проверки HTTP-ошибки
  // Превращаем JSON-ответ в объект типа Rates
  const data = (await response.json()) as Rates;
  // Сам API тоже сообщает об успехе в поле result; проверяем его
  if (data.result !== "success") {
    // Если не "success" — API вернул ошибку, прерываем работу
    throw new Error("Курсы: API вернул ошибку");
  } // конец проверки result
  // Возвращаем готовые данные тому, кто вызвал функцию
  return data;
} // конец getRates

// ---------- Главная функция: оба запроса параллельно ----------

// Функция, которая собирает и погоду, и курсы в один результат
async function getDashboard() {
  // Promise.all запускает ОБА запроса одновременно и ждёт, пока придут оба.
  // Время = время самого медленного запроса, а не сумма двух.
  // Результат — массив [погода, курсы]; сразу раскладываем его по переменным
  const [weather, rates] = await Promise.all([getWeather(), getRates()]);

  // Курс "сколько тенге за 1 единицу валюты": rates даны относительно USD
  // Берём курс тенге: сколько KZT в одном долларе
  const kzt = rates.rates["KZT"];
  // Возвращаем один общий объект с погодой и курсами
  return {
    city: "Алматы", // название города (для вывода)
    temperature: weather.current.temperature_2m, // температура из ответа погоды
    wind: weather.current.wind_speed_10m, // скорость ветра из ответа погоды
    usdToKzt: kzt, // 1 доллар в тенге — берём как есть
    eurToKzt: kzt / rates.rates["EUR"], // 1 евро в тенге: тенге за доллар делим на евро за доллар
    rubToKzt: kzt / rates.rates["RUB"], // 1 рубль в тенге: тот же приём
  }; // конец возвращаемого объекта
} // конец getDashboard

// Точка входа: запускает всё и красиво выводит результат
async function main() {
  // Сообщение пользователю, что запрос пошёл
  console.log("получаем погоду и курсы валют одновременно...");
  // Запоминаем время старта (в миллисекундах), чтобы потом измерить длительность
  const start = Date.now();

  // Ждём, пока getDashboard вернёт собранные данные
  const d = await getDashboard();

  // Сколько миллисекунд ушло на оба запроса (\n — пустая строка после)
  console.log(`получено за ${Date.now() - start} мс\n`);
  // Выводим погоду
  console.log(`В городе ${d.city} сейчас ${d.temperature} °C, ветер ${d.wind} км/ч`);
  // Выводим курс доллара; toFixed(2) оставляет 2 знака после запятой
  console.log(`1 USD = ${d.usdToKzt.toFixed(2)} KZT`);
  // Выводим курс евро
  console.log(`1 EUR = ${d.eurToKzt.toFixed(2)} KZT`);
  // Выводим курс рубля
  console.log(`1 RUB = ${d.rubToKzt.toFixed(2)} KZT`);

  // То же самое как JSON — именно так данные отдают другим программам по API
  // Заголовок перед JSON-выводом
  console.log("\nJSON:");
  // JSON.stringify превращает объект в JSON-текст; null, 2 — красивые отступы в 2 пробела
  console.log(JSON.stringify(d, null, 2));
} // конец main

// Запускаем main; если где-то случилась ошибка (throw), .catch выведет её, а не уронит программу
main().catch((err) => console.error("Ошибка:", err.message));
