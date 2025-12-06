/**
 * MCP Client
 * Calls MCP server tools directly via HTTP
 */

class MCPClient {
  constructor() {
    this.mcpUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
    this.apiKey = 'secure-random-key-change-this-in-production';
  }

  /**
   * Call MCP tool
   */
  async callTool(toolName, params) {
    try {
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(`${this.mcpUrl}/call-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: params
          }
        })
      });

      if (!response.ok) {
        throw new Error(`MCP tool call failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[MCP Client] Called tool ${toolName}:`, result);
      return result;
    } catch (error) {
      console.error(`[MCP Client] Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Create task from notification
   */
  async createTaskFromNotification(params) {
    return await this.callTool('create_task_from_notification', params);
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    return await this.callTool('delete_notification', { notification_id: notificationId });
  }

  /**
   * Edit task
   */
  async editTask(params) {
    return await this.callTool('edit_task', params);
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    return await this.callTool('delete_task', { task_id: taskId });
  }

  /**
   * Mark task complete
   */
  async markTaskComplete(taskId) {
    return await this.callTool('mark_task_complete', { task_id: taskId });
  }
}

module.exports = MCPClient;
