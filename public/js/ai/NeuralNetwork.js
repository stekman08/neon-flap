/**
 * Simple feedforward neural network for neuroevolution
 * Used by AI birds during training mode
 */
export class NeuralNetwork {
    /**
     * Create a new neural network
     * @param {number} inputNodes - Number of input neurons
     * @param {number} hiddenNodes - Number of hidden layer neurons
     * @param {number} outputNodes - Number of output neurons
     */
    constructor(inputNodes, hiddenNodes, outputNodes) {
        this.inputNodes = inputNodes;
        this.hiddenNodes = hiddenNodes;
        this.outputNodes = outputNodes;

        // Initialize weights with random values between -1 and 1
        this.weightsIH = this.createMatrix(hiddenNodes, inputNodes);
        this.weightsHO = this.createMatrix(outputNodes, hiddenNodes);

        // Biases
        this.biasH = this.createArray(hiddenNodes);
        this.biasO = this.createArray(outputNodes);

        this.randomize();
    }

    /**
     * Create a 2D array (matrix)
     */
    createMatrix(rows, cols) {
        return Array.from({ length: rows }, () => new Array(cols).fill(0));
    }

    /**
     * Create a 1D array
     */
    createArray(size) {
        return new Array(size).fill(0);
    }

    /**
     * Randomize all weights and biases
     */
    randomize() {
        for (let i = 0; i < this.hiddenNodes; i++) {
            for (let j = 0; j < this.inputNodes; j++) {
                this.weightsIH[i][j] = Math.random() * 2 - 1;
            }
            this.biasH[i] = Math.random() * 2 - 1;
        }

        for (let i = 0; i < this.outputNodes; i++) {
            for (let j = 0; j < this.hiddenNodes; j++) {
                this.weightsHO[i][j] = Math.random() * 2 - 1;
            }
            this.biasO[i] = Math.random() * 2 - 1;
        }
    }

    /**
     * Sigmoid activation function
     */
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }

    /**
     * Feedforward - compute output from inputs
     * @param {number[]} inputs - Input values (should match inputNodes length)
     * @returns {number[]} - Output values
     */
    predict(inputs) {
        if (inputs.length !== this.inputNodes) {
            throw new Error(`Expected ${this.inputNodes} inputs, got ${inputs.length}`);
        }

        // Calculate hidden layer
        const hidden = new Array(this.hiddenNodes);
        for (let i = 0; i < this.hiddenNodes; i++) {
            let sum = this.biasH[i];
            for (let j = 0; j < this.inputNodes; j++) {
                sum += inputs[j] * this.weightsIH[i][j];
            }
            hidden[i] = this.sigmoid(sum);
        }

        // Calculate output layer
        const outputs = new Array(this.outputNodes);
        for (let i = 0; i < this.outputNodes; i++) {
            let sum = this.biasO[i];
            for (let j = 0; j < this.hiddenNodes; j++) {
                sum += hidden[j] * this.weightsHO[i][j];
            }
            outputs[i] = this.sigmoid(sum);
        }

        return outputs;
    }

    /**
     * Create a copy of this network
     * @returns {NeuralNetwork} - A new network with same weights
     */
    copy() {
        const nn = new NeuralNetwork(this.inputNodes, this.hiddenNodes, this.outputNodes);

        // Copy weights IH
        for (let i = 0; i < this.hiddenNodes; i++) {
            for (let j = 0; j < this.inputNodes; j++) {
                nn.weightsIH[i][j] = this.weightsIH[i][j];
            }
            nn.biasH[i] = this.biasH[i];
        }

        // Copy weights HO
        for (let i = 0; i < this.outputNodes; i++) {
            for (let j = 0; j < this.hiddenNodes; j++) {
                nn.weightsHO[i][j] = this.weightsHO[i][j];
            }
            nn.biasO[i] = this.biasO[i];
        }

        return nn;
    }

    /**
     * Mutate the network weights with given rate
     * @param {number} rate - Mutation rate (0-1), probability of each weight being mutated
     */
    mutate(rate) {
        const mutateValue = (val) => {
            if (Math.random() < rate) {
                // Add gaussian noise
                return val + this.gaussianRandom() * 0.5;
            }
            return val;
        };

        // Mutate weights IH
        for (let i = 0; i < this.hiddenNodes; i++) {
            for (let j = 0; j < this.inputNodes; j++) {
                this.weightsIH[i][j] = mutateValue(this.weightsIH[i][j]);
            }
            this.biasH[i] = mutateValue(this.biasH[i]);
        }

        // Mutate weights HO
        for (let i = 0; i < this.outputNodes; i++) {
            for (let j = 0; j < this.hiddenNodes; j++) {
                this.weightsHO[i][j] = mutateValue(this.weightsHO[i][j]);
            }
            this.biasO[i] = mutateValue(this.biasO[i]);
        }
    }

    /**
     * Generate a random number with gaussian distribution (mean 0, std 1)
     * Using Box-Muller transform
     */
    gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    /**
     * Crossover with another network to create a child
     * @param {NeuralNetwork} partner - The other parent network
     * @returns {NeuralNetwork} - Child network
     */
    crossover(partner) {
        const child = new NeuralNetwork(this.inputNodes, this.hiddenNodes, this.outputNodes);

        // Crossover weights IH
        for (let i = 0; i < this.hiddenNodes; i++) {
            for (let j = 0; j < this.inputNodes; j++) {
                child.weightsIH[i][j] = Math.random() < 0.5 ? this.weightsIH[i][j] : partner.weightsIH[i][j];
            }
            child.biasH[i] = Math.random() < 0.5 ? this.biasH[i] : partner.biasH[i];
        }

        // Crossover weights HO
        for (let i = 0; i < this.outputNodes; i++) {
            for (let j = 0; j < this.hiddenNodes; j++) {
                child.weightsHO[i][j] = Math.random() < 0.5 ? this.weightsHO[i][j] : partner.weightsHO[i][j];
            }
            child.biasO[i] = Math.random() < 0.5 ? this.biasO[i] : partner.biasO[i];
        }

        return child;
    }

    /**
     * Export network to JSON for saving
     */
    toJSON() {
        return {
            inputNodes: this.inputNodes,
            hiddenNodes: this.hiddenNodes,
            outputNodes: this.outputNodes,
            weightsIH: this.weightsIH,
            weightsHO: this.weightsHO,
            biasH: this.biasH,
            biasO: this.biasO
        };
    }

    /**
     * Create network from JSON
     * @param {Object} json - Serialized network data
     * @returns {NeuralNetwork}
     */
    static fromJSON(json) {
        const nn = new NeuralNetwork(json.inputNodes, json.hiddenNodes, json.outputNodes);
        nn.weightsIH = json.weightsIH;
        nn.weightsHO = json.weightsHO;
        nn.biasH = json.biasH;
        nn.biasO = json.biasO;
        return nn;
    }
}
