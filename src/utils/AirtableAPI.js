import axios from 'axios';

// Securely pulling values from .env
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_TOKEN;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME;
const COUNTER_TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_COUNTER;
const RECORD_ID = import.meta.env.VITE_AIRTABLE_TABLE_COUNTER_ID;
const ACTIONS_TABLE_NAME = import.meta.env.VITE_AIRTABLE_ACTIONS_TABLE_ID;
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
const RECORD_URL = `https://api.airtable.com/v0/${BASE_ID}/${COUNTER_TABLE_NAME}/${RECORD_ID}`;

export const GET_LIST_AirtableData = async () => {
    try {
        console.log('📡 Fetching from:', AIRTABLE_URL);
        const response = await axios.get(AIRTABLE_URL, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            },
        });
        console.log('✅ Airtable response:', response.data);
        return response.data.records;
    } catch (error) {
        console.error(' Airtable error:', error.response?.data || error.message);
        return [];
    }
};

export const GET_RECORD_AirtableData = async (tableName, recordId) => {  
  const urlTableName = tableName === 'counter' ? COUNTER_TABLE_NAME : ACTIONS_TABLE_NAME;
  const urlRecordId = tableName === 'counter' ? RECORD_ID : recordId;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${urlTableName}/${urlRecordId}`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });
    console.log('✅ Airtable response:', response.data);
    return response.data;
  } catch (error) {
    console.error(' Airtable error:', error.response?.data || error.message);
    return [];
  }
};

export const GET_FILTERED_RECORDS = async (recordId) => {
  const urlTableName = ACTIONS_TABLE_NAME;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${urlTableName}?filterByFormula=%7BProject+ID%7D+%3D+%22${recordId}%22`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });
    console.log('✅ Airtable response:', response.data);
    return response.data;
  } catch (error) {
    console.error(' Airtable error:', error.response?.data || error.message);
    return [];
  }
}
export const UPDATE_RECORD_AirtableData = async (data, recordId, tableName) => {
  console.log("Updating record:", data);
  const urlTableName = tableName === 'counter' ? COUNTER_TABLE_NAME : tableName === 'actions' ? ACTIONS_TABLE_NAME : TABLE_NAME;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${urlTableName}/${recordId}`;
  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  };
  try {
    const response = await axios.patch(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error(' Airtable error:', error.response?.data || error.message);
    return [];
  }
};

export const UPDATE_MULTIPLE_RECORDS = async (recordsToUpdate, tableName) => {
  const urlTableName = tableName === 'counter' ? COUNTER_TABLE_NAME : tableName === 'actions' ? ACTIONS_TABLE_NAME : TABLE_NAME;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${urlTableName}`;

  // Axios automatically sets Content-Type to application/json when sending an object as data
  const headers = {
    "Authorization": `Bearer ${AIRTABLE_API_KEY}`
  };

  const data = {
    records: recordsToUpdate
  };
  console.log(recordsToUpdate)

  try {
    // Make the PATCH request using axios
    const response = await axios.patch(url, data, { headers: headers });

    console.log("Records updated successfully:", response.data);
    return response.data; // Axios response data is directly available in response.data
  } catch (error) {
    // Axios errors have a response property if the server responded
    if (error.response) {
      console.error(`Airtable API error: ${error.response.status} ${error.response.statusText} -`, error.response.data);
      throw new Error(`Airtable API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received from Airtable:", error.request);
      throw new Error("No response received from Airtable. Check network connection.");
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error setting up Airtable request:", error.message);
      throw new Error(`Error setting up Airtable request: ${error.message}`);
    }
  }
  };

  export const CREATE_RECORDS = async (recordsToCreate, tableName) => {
    const urlTableName = tableName === 'counter' ? COUNTER_TABLE_NAME : tableName === 'actions' ? ACTIONS_TABLE_NAME : TABLE_NAME;
    const url = `https://api.airtable.com/v0/${BASE_ID}/${urlTableName}`;
    const headers = {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json"
    };
    
    
    const numericFields = ['Full Cost', 'Paid', 'Balance'];
    
    const processedRecords = recordsToCreate.map(record => {
      const cleanedFields = {};
    
      for (const field in record.fields) {
        let value = record.fields[field];
    
        if (numericFields.includes(field)) {
          cleanedFields[field] = value === '' ? 0 : Number(value);
        } else {
          cleanedFields[field] = value;
        }
      }
    
      return { fields: cleanedFields };
    });
  
    console.log("🆕 Processed inserts:", processedRecords);
  
    try {
      const response = await axios.post(url, { records: processedRecords }, { headers });
      console.log("✅ Records created successfully:", response.data);
      console.log("process records", processedRecords)
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error("Airtable API error:", error.response.data);
        throw new Error(`Airtable POST error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error("No response from Airtable:", error.request);
        throw new Error("No response from Airtable.");
      } else {
        console.error("Axios config error:", error.message);
        throw new Error(`Axios error: ${error.message}`);
      }
    }
  };
  