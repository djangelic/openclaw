# Creating Skills

Skills are the superpowers you give your TransparentClaw agent. Each skill is an n8n workflow that your agent can call to perform specific tasks. This guide will teach you to build powerful, reusable skills.

## What is a Skill?

A skill is an n8n workflow that:
- ✅ Accepts input parameters via webhook
- ✅ Performs some action (API calls, calculations, data processing)
- ✅ Returns structured results
- ✅ Is registered in the `skills_registry` Data Table
- ✅ Can be called by the agent during conversations

Think of skills as tools in your agent's toolbox. The more skills you create, the more capable your agent becomes.

## Skill Registry Data Table

The `skills_registry` table acts as your agent's phone book of capabilities. Each row describes one skill:

| Column | Purpose | Example |
|--------|---------|---------|
| `name` | Human-readable skill name | "Check Weather" |
| `description` | What the skill does | "Get weather forecast for any city" |
| `workflow_id` | n8n workflow UUID | "abc-123-def-456" |
| `parameters` | JSON schema for inputs | `[{"name": "city", "type": "string", "required": true}]` |
| `category` | Skill grouping | "weather", "calendar", "utility" |
| `enabled` | Whether agent can use it | `true` |
| `created_at` | When skill was added | "2026-01-15T10:30:00Z" |
| `usage_count` | How often it's called | `42` |
| `last_used` | When last executed | "2026-01-20T14:22:00Z" |

Your agent automatically discovers skills by reading this table.

## Building a Skill Workflow Step by Step

Let's build a comprehensive weather skill from scratch.

### Step 1: Plan Your Skill

Before opening n8n, define:
- **Purpose**: Get current weather and 3-day forecast
- **Inputs**: `city` (string), `units` (optional: metric/imperial)  
- **Outputs**: Current conditions, forecast, alerts
- **Data Source**: OpenWeatherMap API

### Step 2: Create the Workflow

1. **Open n8n** (`http://localhost:5678`)
2. **New Workflow** → Name: "🌦️ Weather Check Skill"
3. **Add Tags**: `skill`, `transparentclaw`, `weather`

### Step 3: Add the Webhook Trigger

1. **Add Node** → **Trigger** → **Webhook**
2. **Configure**:
   - HTTP Method: `POST`
   - Path: `/skill/weather-check`
   - Response Mode: `Respond to Webhook`
3. **Test URL**: Copy for later registration

### Step 4: Add Input Validation

1. **Add Node** → **Code** → **Code**
2. **Name**: "Validate Input"
3. **JavaScript Code**:
   ```javascript
   // Extract parameters from webhook body
   const city = $json.body.city;
   const units = $json.body.units || 'metric';
   
   // Validation
   if (!city || typeof city !== 'string') {
     return {
       error: true,
       message: "City parameter is required and must be a string",
       code: "INVALID_INPUT"
     };
   }
   
   if (!['metric', 'imperial'].includes(units)) {
     return {
       error: true,
       message: "Units must be 'metric' or 'imperial'",
       code: "INVALID_UNITS"
     };
   }
   
   // Return validated parameters
   return {
     city: city.trim(),
     units: units,
     error: false
   };
   ```

### Step 5: Add API Call Logic

1. **Add Node** → **Code** → **HTTP Request**
2. **Name**: "Get Weather Data"
3. **Configure**:
   - Method: `GET`
   - URL: `https://api.openweathermap.org/data/2.5/forecast`
   - Query Parameters:
     - `q`: `{{ $('Validate Input').first().json.city }}`
     - `appid`: `{{ $vars.OPENWEATHER_API_KEY }}`
     - `units`: `{{ $('Validate Input').first().json.units }}`
4. **Add Condition**: Only run if `{{ !$('Validate Input').first().json.error }}`

### Step 6: Process and Format Results

1. **Add Node** → **Code** → **Code**
2. **Name**: "Format Weather Data"
3. **JavaScript Code**:
   ```javascript
   const weatherData = $json;
   const city = $('Validate Input').first().json.city;
   const units = $('Validate Input').first().json.units;
   
   if (!weatherData.list || weatherData.list.length === 0) {
     return {
       error: true,
       message: `Weather data not found for city: ${city}`,
       code: "NO_DATA"
     };
   }
   
   // Current weather (first item)
   const current = weatherData.list[0];
   const tempSymbol = units === 'metric' ? '°C' : '°F';
   const windSymbol = units === 'metric' ? 'm/s' : 'mph';
   
   // Format current conditions
   const currentWeather = {
     temperature: Math.round(current.main.temp),
     feels_like: Math.round(current.main.feels_like),
     humidity: current.main.humidity,
     description: current.weather[0].description,
     wind_speed: current.wind.speed,
     city_name: weatherData.city.name,
     country: weatherData.city.country
   };
   
   // Format 3-day forecast
   const forecast = [];
   const dailyData = {};
   
   // Group by day
   weatherData.list.forEach(item => {
     const date = new Date(item.dt * 1000).toDateString();
     if (!dailyData[date]) {
       dailyData[date] = [];
     }
     dailyData[date].push(item);
   });
   
   // Get first 3 days
   Object.keys(dailyData).slice(0, 3).forEach(date => {
     const dayData = dailyData[date];
     const temps = dayData.map(d => d.main.temp);
     const conditions = dayData.map(d => d.weather[0].description);
     
     forecast.push({
       date: date,
       high_temp: Math.round(Math.max(...temps)),
       low_temp: Math.round(Math.min(...temps)),
       conditions: conditions[Math.floor(conditions.length / 2)], // Mid-day condition
       humidity: dayData[Math.floor(dayData.length / 2)].main.humidity
     });
   });
   
   // Format final response
   return {
     success: true,
     current: currentWeather,
     forecast: forecast,
     units: {
       temperature: tempSymbol,
       wind: windSymbol
     },
     summary: `Current weather in ${currentWeather.city_name}: ${currentWeather.temperature}${tempSymbol}, ${currentWeather.description}. ${forecast.length} day forecast included.`
   };
   ```

### Step 7: Handle Errors Gracefully

1. **Add Node** → **Code** → **Code** 
2. **Name**: "Error Handler"
3. **Connect from all potential error sources**
4. **JavaScript Code**:
   ```javascript
   // Check if we have an error from validation
   const validationData = $('Validate Input').first()?.json;
   if (validationData?.error) {
     return validationData;
   }
   
   // Check for HTTP request errors
   const httpError = $json.error;
   if (httpError) {
     return {
       error: true,
       message: "Failed to fetch weather data. Please check the city name and try again.",
       code: "API_ERROR",
       details: httpError.message
     };
   }
   
   // Generic error fallback
   return {
     error: true,
     message: "An unexpected error occurred while fetching weather data.",
     code: "UNKNOWN_ERROR"
   };
   ```

### Step 8: Add Response Node

1. **Add Node** → **Respond to Webhook**
2. **Connect from both**: "Format Weather Data" and "Error Handler"
3. **Response Body**: `{{ $json }}`
4. **Status Code**: Dynamic based on success/error

### Step 9: Set Up Environment Variables

1. **Settings** → **Variables**
2. **Add Variable**:
   - Key: `OPENWEATHER_API_KEY`  
   - Value: Your OpenWeatherMap API key
   - Type: Credential (secure)

## Testing Your Skill

### Manual Testing in n8n

1. **Click** the Webhook trigger node
2. **Copy** the test URL
3. **Use Postman/curl** to test:
   ```bash
   curl -X POST "http://localhost:5678/webhook/your-test-url" \
   -H "Content-Type: application/json" \
   -d '{
     "city": "Phoenix, AZ",
     "units": "imperial"
   }'
   ```

### Expected Response
```json
{
  "success": true,
  "current": {
    "temperature": 85,
    "feels_like": 89,
    "humidity": 25,
    "description": "clear sky",
    "wind_speed": 5.2,
    "city_name": "Phoenix",
    "country": "US"
  },
  "forecast": [
    {
      "date": "Thu Feb 27 2026",
      "high_temp": 87,
      "low_temp": 62,
      "conditions": "partly cloudy",
      "humidity": 30
    }
  ],
  "units": {
    "temperature": "°F",
    "wind": "mph"
  },
  "summary": "Current weather in Phoenix: 85°F, clear sky. 3 day forecast included."
}
```

## Registering the Skill

Once your workflow is working:

### Step 1: Get Workflow Details

1. **Workflow Settings** → Copy the **Workflow ID**
2. **Save** the workflow and **Activate** it

### Step 2: Register in Skills Table

1. **Go to n8n** → **Data** → **Data Tables** → **skills_registry**
2. **Add Row** with these values:

```json
{
  "name": "Check Weather",
  "description": "Get current weather conditions and 3-day forecast for any city worldwide. Supports both metric and imperial units.",
  "workflow_id": "your-workflow-id-here",
  "parameters": [
    {
      "name": "city",
      "type": "string", 
      "required": true,
      "description": "City name or 'City, Country' format"
    },
    {
      "name": "units",
      "type": "string",
      "required": false,
      "description": "Temperature units: 'metric' (°C) or 'imperial' (°F)",
      "default": "metric"
    }
  ],
  "category": "weather",
  "enabled": true
}
```

### Step 3: Test with Your Agent

In Chat Hub, try:

```
You: What's the weather like in San Francisco?

Agent: Let me check the current weather in San Francisco for you.

[Executing: Check Weather skill...]

The current weather in San Francisco is 18°C with overcast clouds. 
It feels like 16°C with 72% humidity and light winds at 3.1 m/s.

Here's the 3-day forecast:
• Today: High 20°C, Low 14°C - Overcast
• Tomorrow: High 22°C, Low 15°C - Partly cloudy  
• Day after: High 19°C, Low 13°C - Light rain
```

## Advanced Example: Building a "Check Website Status" Skill

Let's build a more complex skill that checks if websites are up and measures response times.

### Workflow Design

```
Webhook Trigger
    ↓
Input Validation
    ↓
HTTP Request (with timeout)
    ↓         ↓
Success Path  Error Path
    ↓         ↓
Format Results ← Error Handler
    ↓
Respond to Webhook
```

### Key Features

1. **Multiple URL Support**: Check several URLs at once
2. **Response Time Measurement**: Track performance
3. **Status Code Analysis**: Understand failures
4. **SSL Certificate Check**: Security validation
5. **Retry Logic**: Handle temporary failures

### Implementation Highlights

```javascript
// In the HTTP Request logic
const urls = $json.body.urls || [$json.body.url];
const results = [];

for (const url of urls) {
  const startTime = Date.now();
  
  try {
    const response = await this.helpers.httpRequest({
      method: 'GET',
      url: url,
      timeout: 10000,
      returnFullResponse: true
    });
    
    const responseTime = Date.now() - startTime;
    
    results.push({
      url: url,
      status: 'up',
      status_code: response.statusCode,
      response_time_ms: responseTime,
      ssl_valid: url.startsWith('https') ? checkSSL(response) : null,
      last_checked: new Date().toISOString()
    });
  } catch (error) {
    results.push({
      url: url,
      status: 'down',
      error: error.message,
      response_time_ms: Date.now() - startTime,
      last_checked: new Date().toISOString()
    });
  }
}

return { results };
```

## Best Practices

### 1. Error Handling
- Always validate inputs
- Provide meaningful error messages  
- Include error codes for debugging
- Handle API rate limits gracefully

### 2. Documentation
- Clear parameter descriptions
- Usage examples in the registry
- Document any required API keys or setup

### 3. Performance
- Set reasonable timeouts
- Cache results when appropriate
- Avoid expensive operations in loops
- Monitor skill execution times

### 4. Security
- Validate all inputs thoroughly
- Use environment variables for secrets
- Sanitize outputs to prevent injection
- Limit resource consumption

### 5. User Experience
- Return human-readable summaries
- Structure data consistently
- Provide helpful context in responses
- Support common parameter variations

## Skill Categories & Ideas

### 🌐 Web & APIs
- **URL Monitor**: Check website uptime and performance
- **News Fetcher**: Get latest headlines from RSS feeds
- **API Tester**: Validate API endpoints and responses
- **SEO Analyzer**: Check page speed, meta tags, broken links

### 📊 Data & Analytics  
- **CSV Processor**: Parse and analyze CSV files
- **Database Query**: Execute safe read-only database queries
- **Chart Generator**: Create visualizations from data
- **Report Builder**: Generate formatted reports

### 🔧 Productivity
- **File Organizer**: Sort files by date, type, size
- **Text Processor**: Format, convert, or analyze text
- **Email Sender**: Send formatted notifications
- **Calendar Manager**: Schedule and manage events

### 🏠 Smart Home
- **Device Controller**: Control smart home devices
- **Energy Monitor**: Track power consumption
- **Security Check**: Monitor cameras and sensors
- **Climate Control**: Adjust temperature and humidity

## Troubleshooting Skills

### Common Issues

**Skill not appearing in agent:**
- Check workflow is saved and activated
- Verify entry exists in skills_registry
- Confirm `enabled` field is `true`
- Restart the agent conversation

**Parameters not working:**
- Validate JSON schema in parameters field
- Check parameter names match exactly
- Ensure required fields are marked correctly

**Workflow execution fails:**
- Check n8n execution logs
- Verify all required environment variables
- Test webhook manually with curl/Postman
- Check node connections and conditions

**Slow skill responses:**
- Add timeouts to HTTP requests
- Optimize database queries
- Cache expensive operations
- Consider async patterns for long-running tasks

### Debugging Tips

1. **Add Logging**: Insert Code nodes that log intermediate values
2. **Test Incrementally**: Build skills step by step, testing each node
3. **Use Manual Triggers**: Test workflows outside of agent context
4. **Check Execution History**: Review past runs for patterns
5. **Monitor Resource Usage**: Watch CPU/memory during execution

## Skill Marketplace (Future)

We're building a community marketplace where you can:
- **Share Skills**: Publish your workflows for others to use
- **Discover Skills**: Find pre-built capabilities for common tasks
- **Version Control**: Track skill updates and improvements
- **Rating System**: Community feedback on skill quality
- **Documentation Standards**: Consistent skill documentation

Until then, share your best skills in GitHub discussions!

---

**Ready to give your agent superpowers?** Start with the weather example above, then build skills for your specific needs. The only limit is your imagination! 🚀