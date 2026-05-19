from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route('/api/city', methods=['POST'])
def receive_city():
    data = request.get_json()
    city = data.get('city', '').strip()

    if not city:
        return jsonify({'error': 'City name is required'}), 400

    # TODO: add your city-based logic here
    return jsonify({'message': f'Received city: {city}', 'city': city})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
