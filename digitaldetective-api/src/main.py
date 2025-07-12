import os
import random
import time
import webbrowser
import threading
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app)

# MySQL Configuration
MYSQL_CONFIG = {
    'host': 'localhost',
    'database': 'digitaldetective',
    'user': 'root',
    'password': '',
    'charset': 'utf8mb4'
}

def get_db_connection():
    try:
        connection = mysql.connector.connect(**MYSQL_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# Game state storage (in production, use Redis or database)
game_sessions = {}

# Rotas para servir as páginas
@app.route('/landing')
def serve_landing():
    return send_from_directory(app.static_folder, 'landing.html')

@app.route('/game')
def serve_game():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/')
def home():
    return redirect('/landing')

# API Routes
@app.route('/api/cases', methods=['GET'])
def get_cases():
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM casos")
        cases = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'cases': cases})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/assistants', methods=['GET'])
def get_assistants():
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM assistentes")
        assistants = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'assistants': assistants})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/game/start', methods=['POST'])
def start_game():
    try:
        data = request.get_json()
        assistant_id = data.get('assistant_id')
        
        if not assistant_id:
            return jsonify({'error': 'Assistant ID required'}), 400
        
        # Generate user ID
        user_id = random.randint(1000, 9999)
        case_id = 1  # Default case
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get case info
        cursor.execute("SELECT * FROM casos WHERE case_id = %s", (case_id,))
        case_info = cursor.fetchone()
        
        # Get assistant info
        cursor.execute("SELECT * FROM assistentes WHERE assistente_id = %s", (assistant_id,))
        assistant = cursor.fetchone()
        
        # Generate case solution manually
        
        # Get random suspect and weapon for this case
        cursor.execute("SELECT suspect_id FROM caso_suspect WHERE case_id = %s", (case_id,))
        suspects = cursor.fetchall()
        cursor.execute("SELECT weapon_id FROM case_weapon WHERE case_id = %s", (case_id,))
        weapons = cursor.fetchall()
        
        if suspects and weapons:
            culprit_id = random.choice(suspects)['suspect_id']
            weapon_id = random.choice(weapons)['weapon_id']
            
            # Insert solution
            cursor.execute("""
                INSERT INTO game_solution (case_id, user_id, culprit_id, weapon_id, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE
                culprit_id = VALUES(culprit_id),
                weapon_id = VALUES(weapon_id),
                created_at = VALUES(created_at)
            """, (case_id, user_id, culprit_id, weapon_id))
        
        # Store game session
        game_sessions[user_id] = {
            'case_id': case_id,
            'assistant_id': assistant_id,
            'start_time': datetime.now(),
            'emails': [],
            'chat_history': [],
            'notes': [],
            'discovered_clues': [],
            'analyzed_weapons': []
        }
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'case_id': case_id,
            'case_info': case_info,
            'assistant': assistant
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/game/status/<int:user_id>', methods=['GET'])
def get_game_status(user_id):
    try:
        if user_id not in game_sessions:
            return jsonify({'error': 'Game session not found'}), 404
        
        session = game_sessions[user_id]
        return jsonify({
            'success': True,
            'status': session
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/suspects/<int:case_id>', methods=['GET'])
def get_suspects(case_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT s.*, cs.relationship_to_victim, cs.custom_alibi, cs.custom_motive, cs.custom_attitude
        FROM suspeitos s
        JOIN caso_suspect cs ON s.suspect_id = cs.suspect_id
        WHERE cs.case_id = %s
        """
        cursor.execute(query, (case_id,))
        suspects = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'suspects': suspects})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/investigation/clues/<int:case_id>', methods=['GET'])
def get_clues(case_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT p.*, cc.location_id, cc.suspect_id, cc.is_hidden
        FROM pista p
        JOIN case_clue cc ON p.clue_id = cc.clue_id
        WHERE cc.case_id = %s
        """
        cursor.execute(query, (case_id,))
        clues = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'clues': clues})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/investigation/analyze', methods=['POST'])
def analyze_evidence():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        clue_id = data.get('clue_id')
        weapon_id = data.get('weapon_id')
        
        if user_id not in game_sessions:
            return jsonify({'error': 'Game session not found'}), 404
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        analysis_result = ""
        
        if clue_id:
            cursor.execute("SELECT * FROM pista WHERE clue_id = %s", (clue_id,))
            clue = cursor.fetchone()
            if clue:
                analysis_result = clue['description']
                game_sessions[user_id]['discovered_clues'].append(clue_id)
        
        elif weapon_id:
            cursor.execute("SELECT * FROM arma WHERE weapon_id = %s", (weapon_id,))
            weapon = cursor.fetchone()
            if weapon:
                analysis_result = weapon['inspection_message']
                game_sessions[user_id]['analyzed_weapons'].append(weapon_id)
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'analysis': analysis_result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/emails/<int:user_id>', methods=['GET'])
def get_emails(user_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Busca e-mails recebidos pelo usuário
        cursor.execute("""
            SELECT 
                e.email_id as id,
                CASE 
                    WHEN e.sender_id IS NULL THEN 'Sistema'
                    WHEN e.sender_id = %s THEN 'Você'
                    ELSE s.name 
                END as sender,
                e.subject,
                e.content,
                e.sent_time as timestamp,
                ue.`is_read` as `read`, 
                IF(e.sender_id = %s, 1, 0) as sent,
                e.sender_id
            FROM emails e
            LEFT JOIN user_emails ue ON e.email_id = ue.email_id AND ue.user_id = %s
            LEFT JOIN suspeitos s ON e.sender_id = s.suspect_id
            WHERE ue.user_id = %s OR e.sender_id = %s
            ORDER BY e.sent_time DESC
        """, (user_id, user_id, user_id, user_id, user_id))
        
        emails = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'emails': emails
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/emails/send', methods=['POST'])
def send_email():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        recipient_id = data.get('recipient_id')
        subject = data.get('subject')
        content = data.get('content')
        
        if not all([user_id, recipient_id, subject, content]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Insere o e-mail na tabela emails
        cursor.execute("""
            INSERT INTO emails (case_id, sender_id, subject, content, sent_time)
            VALUES (%s, %s, %s, %s, NOW())
        """, (1, user_id, subject, content))
        
        email_id = cursor.lastrowid
        
        # Registra o e-mail enviado pelo usuário
        cursor.execute("""
            INSERT INTO user_emails (user_id, case_id, email_id, is_read, received_at)
            VALUES (%s, %s, %s, 1, NOW())
        """, (user_id, 1, email_id))
        
        # Registra o e-mail para o destinatário (se for um NPC)
        if recipient_id != user_id:
            cursor.execute("""
                INSERT INTO user_emails (user_id, case_id, email_id, is_read, received_at)
                VALUES (%s, %s, %s, 0, NOW())
            """, (recipient_id, 1, email_id))
        
        connection.commit()
        
        # Simula resposta automática se for um NPC
        if recipient_id != user_id:
            def generate_response():
                time.sleep(random.randint(5, 15))
                
                conn = get_db_connection()
                if conn:
                    try:
                        c = conn.cursor(dictionary=True)
                        
                        # Cria resposta automática
                        c.execute("SELECT name FROM suspeitos WHERE suspect_id = %s", (recipient_id,))
                        sender_name = c.fetchone()['name']
                        
                        response_content = f"De {sender_name}:\n\nObrigado pela sua mensagem. {random.choice(['Estou analisando sua solicitação.', 'Preciso verificar alguns detalhes antes de responder completamente.', 'Vou providenciar uma resposta mais completa em breve.'])}"
                        
                        c.execute("""
                            INSERT INTO emails (case_id, sender_id, subject, content, sent_time)
                            VALUES (%s, %s, %s, %s, NOW())
                        """, (1, recipient_id, f"Re: {subject}", response_content))
                        
                        reply_id = c.lastrowid
                        
                        # Associa resposta ao usuário
                        c.execute("""
                            INSERT INTO user_emails (user_id, case_id, email_id, is_read, received_at)
                            VALUES (%s, %s, %s, 0, NOW())
                        """, (user_id, 1, reply_id))
                        
                        conn.commit()
                        c.close()
                    except Exception as e:
                        print(f"Error generating email response: {e}")
                    finally:
                        conn.close()
            
            threading.Thread(target=generate_response).start()
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'email_id': email_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/emails/mark-read', methods=['POST'])
def mark_email_read():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        email_id = data.get('email_id')
        
        if not all([user_id, email_id]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        
        # Marca e-mail como lido
        cursor.execute("""
            UPDATE user_emails 
            SET is_read = 1 
            WHERE user_id = %s AND email_id = %s
        """, (user_id, email_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/message', methods=['POST'])
def send_chat_message():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        message = data.get('message')
        assistant_id = data.get('assistant_id')
        
        if user_id not in game_sessions:
            return jsonify({'error': 'Game session not found'}), 404
        
        # Add user message to history
        user_msg = {
            'sender': 'user',
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
        game_sessions[user_id]['chat_history'].append(user_msg)
        
        # Generate assistant response based on assistant type
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM assistentes WHERE assistente_id = %s", (assistant_id,))
        
        # Simple response generation based on assistant personality
        responses = {
            1: "Deixa comigo, tenho contatos que podem ajudar... por um preço.",
            2: "Vou tentar entender o lado humano dessa história...",
            3: "Hackear sistemas? Relaxa, já fiz coisa pior.",
            4: "Quer saber a verdade? Eu sei tudo sobre essa gente...",
            5: "Analisando o perfil... eles têm padrões comportamentais interessantes."
        }
        
        assistant_response = responses.get(assistant_id, "Assistente não disponível no momento.")
        
        # Add assistant response
        assistant_msg = {
            'sender': 'assistant',
            'message': assistant_response,
            'timestamp': datetime.now().isoformat()
        }
        game_sessions[user_id]['chat_history'].append(assistant_msg)
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'assistant_response': assistant_response
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/history/<int:user_id>', methods=['GET'])
def get_chat_history(user_id):
    try:
        if user_id not in game_sessions:
            return jsonify({'error': 'Game session not found'}), 404
        
        return jsonify({
            'success': True,
            'history': game_sessions[user_id]['chat_history']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/news/<int:case_id>', methods=['GET'])
def get_news(case_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT * FROM noticias 
            WHERE case_id = %s
            ORDER BY publish_date DESC
        """, (case_id,))
        
        news_items = cursor.fetchall()
        
        # Se não houver notícias, retorna algumas padrão
        if not news_items:
            news_items = [
                {
                    'news_id': 1,
                    'title': 'Tempestade Isola Mansão Blackwood',
                    'content': 'Uma forte tempestade isolou a Mansão Blackwood na noite do crime, impedindo a saída de qualquer pessoa.',
                    'publish_date': datetime.now()
                },
                {
                    'news_id': 2,
                    'title': 'Morte Misteriosa na Alta Sociedade',
                    'content': 'Edmund Blackwood, conhecido colecionador, foi encontrado morto em circunstâncias misteriosas.',
                    'publish_date': datetime.now()
                }
            ]
        
        # Formata as notícias
        formatted_news = []
        for news in news_items:
            formatted_news.append({
                'id': news['news_id'],
                'headline': news['title'],
                'content': news['content'],
                'timestamp': news['publish_date'].isoformat() if isinstance(news['publish_date'], datetime) else datetime.now().isoformat(),
                'image': news.get('image', None)
            })
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'news': formatted_news
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes/save', methods=['POST'])
def save_note():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        title = data.get('title')
        content = data.get('content')
        note_id = data.get('note_id')
        
        if user_id not in game_sessions:
            return jsonify({'error': 'Game session not found'}), 404
        
        note = {
            'id': note_id or len(game_sessions[user_id]['notes']) + 1,
            'title': title,
            'content': content,
            'timestamp': datetime.now().isoformat()
        }
        
        if note_id:
            # Update existing note
            for i, existing_note in enumerate(game_sessions[user_id]['notes']):
                if existing_note['id'] == note_id:
                    game_sessions[user_id]['notes'][i] = note
                    break
        else:
            # Add new note
            game_sessions[user_id]['notes'].append(note)
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes/<int:user_id>', methods=['GET'])
def get_notes(user_id):
    try:
        if user_id not in game_sessions:
            return jsonify({'error': 'Game session not found'}), 404
        
        return jsonify({
            'success': True,
            'notes': game_sessions[user_id]['notes']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/game/solve', methods=['POST'])
def solve_case():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        suspect_id = data.get('suspect_id')
        weapon_id = data.get('weapon_id')
        
        if user_id not in game_sessions:
            return jsonify({'error': 'Game session not found'}), 404
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get the correct solution
        case_id = game_sessions[user_id]['case_id']
        cursor.execute("SELECT * FROM game_solution WHERE case_id = %s AND user_id = %s", (case_id, user_id))
        solution = cursor.fetchone()
        
        if not solution:
            return jsonify({'error': 'No solution found for this game'}), 404
        
        # Check if the guess is correct
        correct_culprit = solution['culprit_id'] == suspect_id
        correct_weapon = weapon_id is None or solution['weapon_id'] == weapon_id
        
        # Get names for response
        cursor.execute("SELECT name FROM suspeitos WHERE suspect_id = %s", (solution['culprit_id'],))
        correct_culprit_name = cursor.fetchone()['name']
        
        cursor.execute("SELECT name FROM arma WHERE weapon_id = %s", (solution['weapon_id'],))
        correct_weapon_name = cursor.fetchone()['name']
        
        cursor.close()
        connection.close()
        
        if correct_culprit and correct_weapon:
            outcome = 'victory'
            message = 'Parabéns! Você resolveu o caso corretamente!'
        else:
            outcome = 'defeat'
            message = 'Infelizmente, sua dedução estava incorreta. O assassino escapou...'
        
        return jsonify({
            'success': True,
            'outcome': outcome,
            'message': message,
            'correct_culprit_name': correct_culprit_name,
            'correct_weapon_name': correct_weapon_name,
            'your_guess': {
                'suspect_id': suspect_id,
                'weapon_id': weapon_id
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/investigation/weapons/<int:case_id>', methods=['GET'])
def get_case_weapons(case_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Query para obter as armas do caso com informações adicionais
        query = """
        SELECT 
            a.weapon_id,
            a.name,
            a.type,
            a.description,
            a.inspection_message,
            a.image,
            cw.found_at_location_id,
            cw.is_hidden,
            cw.murder_weapon,
            l.name as location_name
        FROM 
            arma a
        JOIN 
            case_weapon cw ON a.weapon_id = cw.weapon_id
        LEFT JOIN 
            local l ON cw.found_at_location_id = l.location_id
        WHERE 
            cw.case_id = %s
        """
        
        cursor.execute(query, (case_id,))
        weapons = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'weapons': weapons
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/<path:path>')
def serve_static(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Abre o navegador automaticamente na landing page
    webbrowser.open("http://localhost:5000/landing")
    print(f"Servidor rodando em: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)