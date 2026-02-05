import random
pop_size =500
sample_size = 50
pop=list(range(1,pop_size+1))
sample=random.sample(pop, sample_size)
print(sample)