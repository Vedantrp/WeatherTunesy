import fetch from "node-fetch";
export default async function handler(req,res){
  const {city} = req.body;
  if(!city) return res.status(400).json({error:"City missing"});

  const key = process.env.WEATHER_API_KEY;

  async function get(q){
    const u=`https://api.weatherapi.com/v1/current.json?key=${key}&q=${encodeURIComponent(q)}&aqi=no`;
    return (await fetch(u)).json();
  }

  let data = await get(city);
  if(data?.error) data = await get(`${city}, India`);

  if(!data?.location) return res.status(404).json({error:"Weather not found"});

  res.json({
    location:`${data.location.name}, ${data.location.country}`,
    temp:data.current.temp_c,
    feels_like:data.current.feelslike_c,
    condition:data.current.condition.text,
  });
}
