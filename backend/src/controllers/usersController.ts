import { Request, Response } from 'express';
import { query } from '../config/database.js';
import { getSubtreeAreaIds } from '../utils/hierarchy.js';
import bcrypt from 'bcrypt';


// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const canViewContactData = ['admin', 'manager'].includes(req.user?.role);
    const fields = canViewContactData
      ? 'id, name, role, area_id, cpf, phone, avatar_url, created_at, available_hours, pode_publicar, mfa_enabled'
      : 'id, name, role, area_id, avatar_url, created_at, available_hours, pode_publicar, mfa_enabled';
    const result = await query(`SELECT ${fields} FROM users ORDER BY name`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const canViewContactData = req.user?.id === id || ['admin', 'manager'].includes(req.user?.role);
    const fields = canViewContactData
      ? 'id, name, role, area_id, cpf, phone, avatar_url, created_at, available_hours, pode_publicar'
      : 'id, name, role, area_id, avatar_url, created_at, available_hours, pode_publicar';
    const result = await query(`SELECT ${fields} FROM users WHERE id = $1`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Create new user
export const createUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id, name, role, areaId, avatarUrl, available_hours, pode_publicar } = req.body;

    if (!id || !name?.trim() || !['admin', 'manager', 'member'].includes(role) || !areaId) {
      return res.status(400).json({ error: 'Dados de usuário inválidos.' });
    }
    
    // Se gestor, validar limites de área e role
    if (user.role === 'manager') {
      if (role === 'admin') {
        return res.status(403).json({ error: 'Gestores não podem criar usuários administradores.' });
      }
      const allowedAreas = await getSubtreeAreaIds(user.area_id);
      if (!allowedAreas.includes(areaId)) {
        return res.status(403).json({ error: 'Você só pode criar usuários dentro da sua própria área/subárea.' });
      }
    }
    
    const finalPodePublicar = user.role === 'admin' ? Boolean(pode_publicar) : false;
    
    const result = await query(
      `INSERT INTO users (id, name, role, area_id, avatar_url, available_hours, pode_publicar)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, role, area_id, avatar_url, available_hours, pode_publicar, created_at`,
      [id, name, role, areaId, avatarUrl, available_hours || 160, finalPodePublicar]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user (or create if doesn't exist)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { name, role, areaId, avatarUrl, available_hours, cpf, phone, password, pode_publicar } = req.body;

    if (password && password.length < 12) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 12 caracteres.' });
    }
    
    // Buscar dados atuais do usuário para comparação e travamento
    const currentUserResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    const dbUser = currentUserResult.rows[0];

    // Se o usuário não existir e quem está editando não for admin, recusar
    if (!dbUser && user.role !== 'admin') {
      return res.status(403).json({ error: 'Você não tem permissão para criar novos IDs de usuário.' });
    }

    // Se não for o próprio usuário se editando, aplicar controles de administrador/gestor
    if (user.id !== id) {
      if (user.role === 'member') {
        return res.status(403).json({ error: 'Você não tem permissão para editar outros usuários.' });
      }
      
      // Se gestor, validar limites de área e role
      if (user.role === 'manager') {
        if (role === 'admin') {
          return res.status(403).json({ error: 'Gestores não podem conceder a role de administrador.' });
        }
        
        const allowedAreas = await getSubtreeAreaIds(user.area_id);
        // Validar se a nova área do usuário está permitida
        if (areaId && !allowedAreas.includes(areaId)) {
          return res.status(403).json({ error: 'Você só pode mover ou associar usuários dentro da sua própria área/subárea.' });
        }

        // Validar se o usuário que está sendo editado pertence à subárvore do gestor
        if (dbUser) {
          if (!allowedAreas.includes(dbUser.area_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para editar usuários de outras áreas.' });
          }
          if (dbUser.role === 'admin') {
            return res.status(403).json({ error: 'Gestores não podem editar usuários administradores.' });
          }
        }
      }
    }

    // Travamento de segurança para auto-edição:
    // O próprio usuário editando a si mesmo NÃO pode mudar cargo, área ou horas de alocação (exceto admins).
    let finalRole = role;
    let finalAreaId = areaId;
    let finalAvailableHours = available_hours;

    if (user.id === id && dbUser && user.role !== 'admin') {
      finalRole = dbUser.role;
      finalAreaId = dbUser.area_id;
      finalAvailableHours = dbUser.available_hours;
    }

    // Travamento de segurança para permissão de publicação:
    // Apenas Superadmins (admin) podem alterar essa flag.
    let finalPodePublicar = dbUser ? dbUser.pode_publicar : false;
    if (user.role === 'admin') {
      finalPodePublicar = pode_publicar !== undefined ? Boolean(pode_publicar) : (dbUser ? dbUser.pode_publicar : false);
    }

    // Tratar hash da senha
    let finalPasswordHash = dbUser ? dbUser.password_hash : null;
    if (password) {
      finalPasswordHash = await bcrypt.hash(password, 12);
    }

    const finalCpf = cpf !== undefined ? (cpf?.trim() || null) : (dbUser ? dbUser.cpf : null);
    const finalPhone = phone !== undefined ? (phone?.trim() || null) : (dbUser ? dbUser.phone : null);

    // Use UPSERT: Insert if not exists, update if exists
    const result = await query(
      `INSERT INTO users (id, name, role, area_id, avatar_url, available_hours, cpf, phone, password_hash, pode_publicar) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) 
       DO UPDATE SET name = $2, role = $3, area_id = $4, avatar_url = $5, available_hours = $6, 
                     cpf = $7, phone = $8, password_hash = COALESCE($9, users.password_hash),
                     pode_publicar = $10,
                     token_version = users.token_version + 1
       RETURNING *`,
      [
        id, 
        name, 
        finalRole, 
        finalAreaId, 
        avatarUrl, 
        finalAvailableHours !== undefined ? (finalAvailableHours || 160) : 160, 
        finalCpf, 
        finalPhone, 
        finalPasswordHash,
        finalPodePublicar
      ]
    );
    
    // Remover password_hash da resposta antes de retornar
    const updatedUser = result.rows[0];
    const { password_hash, ...userWithoutPassword } = updatedUser;
    
    res.json({
      id: userWithoutPassword.id,
      name: userWithoutPassword.name,
      role: userWithoutPassword.role,
      areaId: userWithoutPassword.area_id,
      avatarUrl: userWithoutPassword.avatar_url,
      cpf: userWithoutPassword.cpf,
      phone: userWithoutPassword.phone,
      available_hours: userWithoutPassword.available_hours ? Number(userWithoutPassword.available_hours) : undefined,
      pode_publicar: userWithoutPassword.pode_publicar
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === '23505') { // Código de erro do PostgreSQL para violação de UNIQUE constraint
      return res.status(400).json({ error: 'O CPF fornecido já está cadastrado em outro usuário.' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (user.id === id) {
      return res.status(400).json({ error: 'Não é permitido excluir o próprio usuário.' });
    }
    
    if (user.role === 'manager') {
      const allowedAreas = await getSubtreeAreaIds(user.area_id);
      const targetUserResult = await query('SELECT area_id, role FROM users WHERE id = $1', [id]);
      if (targetUserResult.rows.length > 0) {
        const targetUser = targetUserResult.rows[0];
        if (!allowedAreas.includes(targetUser.area_id)) {
          return res.status(403).json({ error: 'Você não tem permissão para excluir usuários de outras áreas.' });
        }
        if (targetUser.role === 'admin') {
          return res.status(403).json({ error: 'Gestores não podem excluir usuários administradores.' });
        }
      }
    }
    
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
