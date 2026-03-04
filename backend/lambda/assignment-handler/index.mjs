import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });

// Change this ONLY if needed
const USERS_TABLE = "Users";

export const handler = async (event) => {
  console.log("Full event received:", JSON.stringify(event));

  try {
    // Safely parse body
    let body;

    if (!event.body) {
      body = event; // direct test from Lambda console
    } else if (typeof event.body === "string") {
      body = JSON.parse(event.body);
    } else {
      body = event.body;
    }

    console.log("Parsed body:", body);

    const { userID, email, name } = body || {};

    if (!userID || !email) {
      console.log("Missing required fields");
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: "Missing required fields (userID and email required)"
        })
      };
    }

    await client.send(
      new PutItemCommand({
        TableName: USERS_TABLE,
        Item: {
          userID: { S: userID },
          email: { S: email },
          name: { S: name || "" },
          createdAt: { S: new Date().toISOString() }
        }
      })
    );

    console.log("User successfully written to DynamoDB");

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "User saved successfully"
      })
    };

  } catch (error) {
    console.error("ERROR OCCURRED:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message
      })
    };
  }
};
