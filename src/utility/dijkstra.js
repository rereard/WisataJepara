// Priority Queue implementation
class PriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(value, priority) {
    this.values.push({value, priority});
    this.sort();
  }

  dequeue() {
    return this.values.shift();
  }

  isEmpty() {
    return this.values.length === 0;
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }
}

export function dijkstra(adjacencyList, startNode, endNode) {
  const distances = {};
  const visited = {};
  const priorityQueue = new PriorityQueue();
  const previousNodes = {};
  const chosenEdges = {};

  // Initialize distances and priority queue
  for (const node in adjacencyList) {
    distances[node] = Infinity;
    visited[node] = false;
  }
  distances[startNode] = 0;
  priorityQueue.enqueue(startNode, 0);

  // Helper function to construct the path
  function constructPath(previousNodes, chosenEdges, endNode) {
    let path = [];
    let edges = [];
    let currentNode = endNode;
    while (currentNode) {
      if (previousNodes[currentNode]) {
        edges.unshift(chosenEdges[currentNode]);
      }
      path.unshift(currentNode);
      currentNode = previousNodes[currentNode];
    }
    return {path, edges};
  }

  while (!priorityQueue.isEmpty()) {
    const {value: currentNode} = priorityQueue.dequeue();

    if (currentNode === endNode) {
      return {
        distance: distances[endNode],
        ...constructPath(previousNodes, chosenEdges, endNode),
      };
    }

    if (!visited[currentNode]) {
      visited[currentNode] = true;

      adjacencyList[currentNode].forEach(neighbor => {
        const {node: neighborNode, weight, edgeId} = neighbor;
        if (!visited[neighborNode]) {
          const newDistance = distances[currentNode] + weight;
          if (newDistance < distances[neighborNode]) {
            distances[neighborNode] = newDistance;
            previousNodes[neighborNode] = currentNode;
            chosenEdges[neighborNode] = edgeId;
            priorityQueue.enqueue(neighborNode, newDistance);
          }
        }
      });
    }
  }

  return {distance: Infinity, path: [], edges: []};
}
