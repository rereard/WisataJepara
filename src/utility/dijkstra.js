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

export function yenKShortestPaths(
  dijkstraRes,
  adjacencyList,
  startNode,
  endNode,
  k,
) {
  const shortestPaths = [];
  const potentialPaths = new PriorityQueue();

  const firstPath = dijkstraRes;
  if (firstPath.path.length === 0) return shortestPaths;

  shortestPaths.push(firstPath);

  for (let i = 1; i < k; i++) {
    const lastShortestPath = shortestPaths[shortestPaths.length - 1].path;

    for (let j = 0; j < lastShortestPath.length - 1; j++) {
      const spurNode = lastShortestPath[j];
      const rootPath = lastShortestPath.slice(0, j + 1);
      const rootEdges = shortestPaths[shortestPaths.length - 1].edges.slice(
        0,
        j,
      );

      const removedEdges = new Map();
      const modifiedAdjList = JSON.parse(JSON.stringify(adjacencyList));

      shortestPaths.forEach(pathObj => {
        const path = pathObj.path;
        const edges = pathObj.edges;
        if (JSON.stringify(path.slice(0, j + 1)) === JSON.stringify(rootPath)) {
          const startNode = path[j];
          const endNode = path[j + 1];
          const edgeId = edges[j];
          removedEdges.set(startNode, endNode);

          modifiedAdjList[startNode] = modifiedAdjList[startNode].filter(
            ({node, edgeId: id}) => node !== endNode || id !== edgeId,
          );
        }
      });

      const spurPathResult = dijkstra(modifiedAdjList, spurNode, endNode);
      if (spurPathResult.path.length > 0) {
        const totalPath = [...rootPath.slice(0, -1), ...spurPathResult.path];
        const totalEdges = [...rootEdges, ...spurPathResult.edges];
        potentialPaths.enqueue(
          {
            path: totalPath,
            edges: totalEdges,
            distance: spurPathResult.distance,
          },
          spurPathResult.distance,
        );
      }
    }

    if (potentialPaths.isEmpty()) break;

    const nextPath = potentialPaths.dequeue().value;
    shortestPaths.push(nextPath);
  }

  return shortestPaths;
}
